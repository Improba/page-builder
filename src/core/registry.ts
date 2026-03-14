import type { Component } from 'vue';
import type { IComponentDefinition } from '@/types/component';
import { createPageBuilderError } from '@/core/errors';

// Core registry intentionally uses a plain Map to preserve reference identity
// and avoid coupling core logic to Vue reactivity internals.
const _registry = new Map<string, IComponentDefinition>();

function getRegistrySnapshot(): string {
  const names = [..._registry.keys()];
  return names.length > 0 ? names.join(', ') : '(none)';
}

function normalizeComponentName(name: string): string {
  return name.trim();
}

function createDuplicateComponentError(name: string, message: string) {
  return createPageBuilderError(
    'DUPLICATE_COMPONENT',
    message,
    {
      details: {
        componentName: name,
      },
    },
  );
}

function normalizeAndValidateDefinition(
  definition: IComponentDefinition,
  action: 'register' | 'replace',
): IComponentDefinition {
  const normalizedName = normalizeComponentName(definition.name);
  const normalizedDefinition =
    normalizedName === definition.name ? definition : { ...definition, name: normalizedName };
  if (!normalizedName) {
    throw createPageBuilderError(
      'INVALID_PAGE_DATA',
      `[PageBuilder] Cannot ${action} a component without a name.`,
    );
  }

  if (!normalizedDefinition.component) {
    throw createPageBuilderError(
      'INVALID_PAGE_DATA',
      `[PageBuilder] Component "${normalizedName}" is missing a Vue component instance.`,
    );
  }

  return normalizedDefinition;
}

/**
 * Register a component for use in the page builder.
 * Throws if a component with the same name is already registered.
 */
export function registerComponent(definition: IComponentDefinition): void {
  const normalizedDefinition = normalizeAndValidateDefinition(definition, 'register');
  const normalizedName = normalizedDefinition.name;

  if (_registry.has(normalizedName)) {
    throw createDuplicateComponentError(
      normalizedName,
      `[PageBuilder] Component "${normalizedName}" is already registered. Use replaceComponent() to override.`,
    );
  }

  _registry.set(normalizedName, normalizedDefinition);
}

/**
 * Register multiple components at once.
 */
export function registerComponents(definitions: IComponentDefinition[]): void {
  const normalizedDefinitions = definitions.map((definition) =>
    normalizeAndValidateDefinition(definition, 'register'),
  );
  const batchNames = new Set<string>();

  for (const definition of normalizedDefinitions) {
    if (batchNames.has(definition.name)) {
      throw createDuplicateComponentError(
        definition.name,
        `[PageBuilder] Component "${definition.name}" appears multiple times in the registration batch.`,
      );
    }
    batchNames.add(definition.name);

    if (_registry.has(definition.name)) {
      throw createDuplicateComponentError(
        definition.name,
        `[PageBuilder] Component "${definition.name}" is already registered. Use replaceComponent() to override.`,
      );
    }
  }

  for (const definition of normalizedDefinitions) {
    _registry.set(definition.name, definition);
  }
}

/**
 * Replace an existing component registration.
 */
export function replaceComponent(definition: IComponentDefinition): void {
  const normalizedDefinition = normalizeAndValidateDefinition(definition, 'replace');
  const normalizedName = normalizedDefinition.name;

  _registry.set(normalizedName, normalizedDefinition);
}

/**
 * Unregister a component by name.
 */
export function unregisterComponent(name: string): boolean {
  return _registry.delete(normalizeComponentName(name));
}

/**
 * Retrieve a component definition by name. Returns undefined if not found.
 */
export function getComponent(name: string): IComponentDefinition | undefined {
  return _registry.get(normalizeComponentName(name));
}

/**
 * Retrieve the Vue component for rendering. Throws if not found.
 */
export function resolveComponent(name: string): Component {
  const normalizedName = normalizeComponentName(name);
  const def = _registry.get(normalizedName);
  if (!def) {
    throw createPageBuilderError(
      'MISSING_COMPONENT',
      `[PageBuilder] Component "${normalizedName}" is not registered. Available: ${getRegistrySnapshot()}`,
      {
        details: {
          componentName: normalizedName,
          availableComponents: [..._registry.keys()],
        },
      },
    );
  }
  return def.component;
}

/**
 * Get all registered component definitions.
 */
export function getRegisteredComponents(): IComponentDefinition[] {
  return [..._registry.values()];
}

/**
 * Get all registered component definitions grouped by category.
 */
export function getComponentsByCategory(): Map<string, IComponentDefinition[]> {
  const grouped = new Map<string, IComponentDefinition[]>();
  for (const def of _registry.values()) {
    if (def.hidden) continue;
    const list = grouped.get(def.category) ?? [];
    list.push(def);
    grouped.set(def.category, list);
  }
  return grouped;
}

/**
 * Check if a component is registered.
 */
export function hasComponent(name: string): boolean {
  return _registry.has(normalizeComponentName(name));
}

/**
 * Clear all registered components. Mainly useful for testing.
 */
export function clearRegistry(): void {
  _registry.clear();
}
