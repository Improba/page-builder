import { getComponent } from '@/core/registry';
import type { INode } from '@/types/node';
import type { ISlotDefinition } from '@/types/component';

/**
 * Slots of the parent component that accept the given child component name.
 * Used to validate drop targets (canvas and tree panel).
 */
export function getAllowedDropSlots(parentNode: INode, componentName: string): ISlotDefinition[] {
  const definition = getComponent(parentNode.name);
  if (!definition || definition.slots.length === 0) return [];
  return definition.slots.filter((slot) => {
    const allowedComponents = slot.allowedComponents;
    return (
      !allowedComponents ||
      allowedComponents.length === 0 ||
      allowedComponents.includes(componentName)
    );
  });
}

/**
 * Resolve a valid slot name for dropping the given component into the parent,
 * or null if the parent does not accept this component in any slot.
 */
export function normalizeDropSlot(
  parentNode: INode,
  preferredSlot: string | null | undefined,
  componentName: string,
): string | null {
  const allowedSlots = getAllowedDropSlots(parentNode, componentName);
  if (allowedSlots.length === 0) return null;

  if (preferredSlot) {
    const preferred = allowedSlots.find((slot) => slot.name === preferredSlot);
    if (preferred) return preferred.name;
  }

  const defaultSlot = allowedSlots.find((slot) => slot.name === 'default');
  return defaultSlot?.name ?? allowedSlots[0].name;
}
