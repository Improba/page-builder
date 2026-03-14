import type { App } from 'vue';
import type { IComponentDefinition } from '@/types/component';
import { getComponent, registerComponents } from '@/core/registry';
import { createPageBuilderError } from '@/core/errors';
import { builtInComponents } from '@/built-in';
import PageBuilder from '@/components/PageBuilder.vue';
import { PAGE_BUILDER_I18N_OPTIONS_KEY, type TranslationDictionary } from '@/i18n';

export interface PageBuilderPluginOptions {
  /** Custom components to register in addition to built-in ones. */
  components?: IComponentDefinition[];

  /** If false, built-in components (PbColumn, PbRow, etc.) won't be registered. Default: true. */
  registerBuiltIn?: boolean;

  /** Global component name for <PageBuilder>. Default: 'PageBuilder'. Set to false to skip global registration. */
  globalName?: string | false;

  /** Default locale for editor UI text. Can be overridden per <PageBuilder> instance. */
  locale?: string;

  /** Additional/overridden translation messages grouped by locale. */
  messages?: TranslationDictionary;
}

const INSTALLED_APPS = new WeakSet<App>();

function registerComponentsIdempotently(definitions: IComponentDefinition[]): void {
  const pendingDefinitions: IComponentDefinition[] = [];

  for (const definition of definitions) {
    const normalizedName = definition.name.trim();
    const existing = getComponent(normalizedName);
    if (!existing) {
      pendingDefinitions.push(definition);
      continue;
    }

    if (existing.component !== definition.component) {
      throw createPageBuilderError(
        'DUPLICATE_COMPONENT',
        `[PageBuilder] Component "${normalizedName}" is already registered with a different implementation.`,
        {
          details: {
            componentName: normalizedName,
          },
        },
      );
    }
  }

  if (pendingDefinitions.length > 0) {
    registerComponents(pendingDefinitions);
  }
}

export const PageBuilderPlugin = {
  install(app: App, options: PageBuilderPluginOptions = {}) {
    if (INSTALLED_APPS.has(app)) return;
    INSTALLED_APPS.add(app);

    const {
      components = [],
      registerBuiltIn = true,
      globalName = 'PageBuilder',
      locale,
      messages,
    } = options;

    app.provide(PAGE_BUILDER_I18N_OPTIONS_KEY, { locale, messages });

    if (registerBuiltIn) {
      registerComponentsIdempotently(builtInComponents);
    }

    if (components.length > 0) {
      registerComponentsIdempotently(components);
    }

    if (globalName !== false) {
      app.component(globalName, PageBuilder);
    }
  },
};
