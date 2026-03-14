import { defineComponent, type App } from 'vue';
import { PageBuilderPlugin } from '@/plugin';
import { clearRegistry, getComponent, getRegisteredComponents } from '@/core/registry';
import { PageBuilderError } from '@/core/errors';
import type { IComponentDefinition } from '@/types/component';

function makeDefinition(name: string, component = defineComponent({ name, template: '<div />' })): IComponentDefinition {
  return {
    name,
    label: name,
    category: 'custom',
    component,
    slots: [],
    editableProps: [],
  };
}

function createAppStub(): App {
  return {
    provide: vi.fn().mockReturnThis(),
    component: vi.fn().mockReturnThis(),
  } as unknown as App;
}

describe('PageBuilderPlugin.install', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('is idempotent across repeated installs with the same components', () => {
    const appA = createAppStub();
    const appB = createAppStub();
    const sharedDefinition = makeDefinition('SharedCard');

    PageBuilderPlugin.install(appA, {
      registerBuiltIn: false,
      globalName: false,
      components: [sharedDefinition],
    });

    expect(getRegisteredComponents()).toHaveLength(1);
    expect(getComponent('SharedCard')).toBe(sharedDefinition);

    expect(() =>
      PageBuilderPlugin.install(appB, {
        registerBuiltIn: false,
        globalName: false,
        components: [sharedDefinition],
      }),
    ).not.toThrow();

    expect(getRegisteredComponents()).toHaveLength(1);
    expect(getComponent('SharedCard')).toBe(sharedDefinition);
  });

  it('throws when re-installing with a conflicting implementation for the same name', () => {
    const appA = createAppStub();
    const appB = createAppStub();
    const firstDefinition = makeDefinition('SharedCard', defineComponent({ template: '<article />' }));
    const conflictingDefinition = makeDefinition('SharedCard', defineComponent({ template: '<section />' }));

    PageBuilderPlugin.install(appA, {
      registerBuiltIn: false,
      globalName: false,
      components: [firstDefinition],
    });

    try {
      PageBuilderPlugin.install(appB, {
        registerBuiltIn: false,
        globalName: false,
        components: [conflictingDefinition],
      });
      throw new Error('Expected plugin install to throw for conflicting component registration.');
    } catch (error) {
      expect(error).toBeInstanceOf(PageBuilderError);
      expect((error as PageBuilderError).code).toBe('DUPLICATE_COMPONENT');
    }
  });
});
