import type { IComponentDefinition } from '@/types/component';
import {
  registerComponent,
  registerComponents,
  replaceComponent,
  unregisterComponent,
  getComponent,
  resolveComponent,
  getRegisteredComponents,
  getComponentsByCategory,
  hasComponent,
  clearRegistry,
} from '@/core/registry';
import { PageBuilderError } from '@/core/errors';

function mockDefinition(overrides: Partial<IComponentDefinition> = {}): IComponentDefinition {
  return {
    name: 'TestComp',
    label: 'Test',
    category: 'content',
    component: { template: '<div />' } as any,
    slots: [],
    editableProps: [],
    ...overrides,
  };
}

describe('Component Registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('registerComponent', () => {
    it('adds a component to the registry', () => {
      const def = mockDefinition();
      registerComponent(def);
      expect(getComponent('TestComp')).toBe(def);
    });

    it('throws on duplicate name', () => {
      registerComponent(mockDefinition());
      expect(() => registerComponent(mockDefinition())).toThrowError(
        /already registered/,
      );
    });

    it('throws a standardized duplicate-component error', () => {
      registerComponent(mockDefinition());

      try {
        registerComponent(mockDefinition());
        throw new Error('Expected registerComponent to throw for duplicates.');
      } catch (error) {
        expect(error).toBeInstanceOf(PageBuilderError);
        expect((error as PageBuilderError).code).toBe('DUPLICATE_COMPONENT');
      }
    });

    it('normalizes component names by trimming whitespace', () => {
      const def = mockDefinition({ name: '  TrimmedName  ' });
      registerComponent(def);
      expect(hasComponent('TrimmedName')).toBe(true);
    });
  });

  describe('getComponent', () => {
    it('returns the definition for a registered component', () => {
      const def = mockDefinition();
      registerComponent(def);
      expect(getComponent('TestComp')).toBe(def);
    });

    it('returns undefined for an unregistered component', () => {
      expect(getComponent('NonExistent')).toBeUndefined();
    });
  });

  describe('resolveComponent', () => {
    it('returns the Vue component for a registered name', () => {
      const def = mockDefinition();
      registerComponent(def);
      expect(resolveComponent('TestComp')).toBe(def.component);
    });

    it('throws for an unknown name', () => {
      expect(() => resolveComponent('Unknown')).toThrowError(/not registered/);
    });

    it('throws a standardized missing-component error', () => {
      try {
        resolveComponent('Unknown');
        throw new Error('Expected resolveComponent to throw for missing component.');
      } catch (error) {
        expect(error).toBeInstanceOf(PageBuilderError);
        expect((error as PageBuilderError).code).toBe('MISSING_COMPONENT');
      }
    });
  });

  describe('unregisterComponent', () => {
    it('removes a registered component', () => {
      registerComponent(mockDefinition());
      expect(unregisterComponent('TestComp')).toBe(true);
      expect(getComponent('TestComp')).toBeUndefined();
    });

    it('returns false when the component was not registered', () => {
      expect(unregisterComponent('Ghost')).toBe(false);
    });
  });

  describe('getRegisteredComponents', () => {
    it('returns all registered definitions', () => {
      const a = mockDefinition({ name: 'A' });
      const b = mockDefinition({ name: 'B' });
      registerComponent(a);
      registerComponent(b);

      const all = getRegisteredComponents();
      expect(all).toHaveLength(2);
      expect(all).toContain(a);
      expect(all).toContain(b);
    });

    it('returns an empty array when registry is empty', () => {
      expect(getRegisteredComponents()).toEqual([]);
    });
  });

  describe('getComponentsByCategory', () => {
    it('groups components by category', () => {
      registerComponent(mockDefinition({ name: 'A', category: 'content' }));
      registerComponent(mockDefinition({ name: 'B', category: 'layout' }));
      registerComponent(mockDefinition({ name: 'C', category: 'content' }));

      const grouped = getComponentsByCategory();
      expect(grouped.get('content')).toHaveLength(2);
      expect(grouped.get('layout')).toHaveLength(1);
    });

    it('excludes hidden components', () => {
      registerComponent(mockDefinition({ name: 'Visible', hidden: false }));
      registerComponent(mockDefinition({ name: 'Hidden', hidden: true }));

      const grouped = getComponentsByCategory();
      const all = [...grouped.values()].flat();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Visible');
    });
  });

  describe('clearRegistry', () => {
    it('empties the registry', () => {
      registerComponent(mockDefinition({ name: 'A' }));
      registerComponent(mockDefinition({ name: 'B' }));
      clearRegistry();
      expect(getRegisteredComponents()).toEqual([]);
    });
  });

  describe('replaceComponent', () => {
    it('overrides an existing registration', () => {
      const original = mockDefinition({ label: 'Original' });
      registerComponent(original);

      const replacement = mockDefinition({ label: 'Replacement' });
      replaceComponent(replacement);

      expect(getComponent('TestComp')?.label).toBe('Replacement');
    });

    it('works even if the component was not previously registered', () => {
      const def = mockDefinition({ name: 'Brand New' });
      replaceComponent(def);
      expect(getComponent('Brand New')).toBe(def);
    });
  });

  describe('registerComponents', () => {
    it('registers multiple components at once', () => {
      const defs = [
        mockDefinition({ name: 'A' }),
        mockDefinition({ name: 'B' }),
        mockDefinition({ name: 'C' }),
      ];
      registerComponents(defs);
      expect(getRegisteredComponents()).toHaveLength(3);
      expect(getComponent('A')).toBe(defs[0]);
      expect(getComponent('B')).toBe(defs[1]);
      expect(getComponent('C')).toBe(defs[2]);
    });

    it('throws if any component has a duplicate name', () => {
      registerComponent(mockDefinition({ name: 'Existing' }));
      expect(() =>
        registerComponents([
          mockDefinition({ name: 'New' }),
          mockDefinition({ name: 'Existing' }),
        ]),
      ).toThrowError(/already registered/);
      expect(getComponent('New')).toBeUndefined();
    });

    it('fails atomically when the same name appears twice in a batch', () => {
      expect(() =>
        registerComponents([
          mockDefinition({ name: 'Repeated' }),
          mockDefinition({ name: 'Repeated' }),
        ]),
      ).toThrowError(/appears multiple times/);

      expect(getRegisteredComponents()).toEqual([]);
    });

    it('fails atomically when a later definition is invalid', () => {
      const invalidDefinition = {
        ...mockDefinition({ name: 'Broken' }),
        component: null as unknown as IComponentDefinition['component'],
      };

      expect(() =>
        registerComponents([
          mockDefinition({ name: 'WillNotBeRegistered' }),
          invalidDefinition,
        ]),
      ).toThrowError(/missing a Vue component instance/);

      expect(getComponent('WillNotBeRegistered')).toBeUndefined();
    });
  });

  describe('hasComponent', () => {
    it('returns true for a registered component', () => {
      registerComponent(mockDefinition({ name: 'Present' }));
      expect(hasComponent('Present')).toBe(true);
    });

    it('returns false for an unregistered component', () => {
      expect(hasComponent('Absent')).toBe(false);
    });
  });
});
