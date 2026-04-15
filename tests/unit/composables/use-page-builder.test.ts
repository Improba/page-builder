import { usePageBuilder } from '@/composables/use-page-builder';
import { PageBuilderError } from '@/core/errors';
import type { INode, IPageData } from '@/types/node';

function makeNode(
  id: number,
  name: string,
  children: INode[] = [],
  slot: string | null = 'default',
): INode {
  return {
    id,
    name,
    slot,
    props: {},
    children,
  };
}

function makeInitialData(overrides: Partial<IPageData> = {}): IPageData {
  return {
    meta: {
      id: 'page-1',
      name: 'Landing',
      url: '/landing',
      status: 'draft',
    },
    tree: makeNode(10, 'LayoutRoot', [
      makeNode(11, 'Container'),
      makeNode(1, 'Root', [makeNode(2, 'Text')]),
    ], null),
    contentRootId: 1,
    maxId: 11,
    variables: {
      HERO_TITLE: 'Welcome',
    },
    ...overrides,
  };
}

describe('usePageBuilder', () => {
  describe('initialization', () => {
    it('initializes with default read mode and provided page data', () => {
      const initialData = makeInitialData();
      const builder = usePageBuilder({ initialData });

      expect(builder.mode.value).toBe('read');
      expect(builder.tree.value).toEqual(initialData.tree);
      expect(builder.contentRootId.value).toBe(initialData.contentRootId);
      expect(builder.maxId.value).toBe(initialData.maxId);
      expect(builder.variables.value).toEqual(initialData.variables);
      expect(builder.pageData.value).toEqual(initialData);
      expect(builder.isDirty.value).toBe(false);
    });

    it('honors an explicit initial mode', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData(),
        mode: 'edit',
      });

      expect(builder.mode.value).toBe('edit');
    });

    it('normalizes initial maxId to cover all tree nodes', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({ maxId: 1 }),
      });

      expect(builder.maxId.value).toBe(11);
      expect(builder.pageData.value.maxId).toBe(11);
    });
  });

  describe('setMode', () => {
    it('switches the builder mode', () => {
      const builder = usePageBuilder({ initialData: makeInitialData() });

      builder.setMode('edit');
      expect(builder.mode.value).toBe('edit');

      builder.setMode('read');
      expect(builder.mode.value).toBe('read');
    });
  });

  describe('updateTree', () => {
    it('updates tree, bumps maxId from tree, and marks dirty', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({ maxId: 3 }),
      });
      const newTree = makeNode(4, 'Root', [makeNode(12, 'Hero')], null);

      builder.updateTree(newTree);

      expect(builder.tree.value).toEqual(newTree);
      expect(builder.maxId.value).toBe(12);
      expect(builder.isDirty.value).toBe(true);
    });
  });

  describe('maxId updates', () => {
    it('never decreases maxId when updates contain lower IDs', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({ maxId: 25 }),
      });
      const lowIdTree = makeNode(1, 'Root', [makeNode(2, 'Text')], null);

      builder.updateTree(lowIdTree);

      expect(builder.maxId.value).toBe(25);
    });

    it('tracks the highest id across successive tree updates', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({
          tree: makeNode(1, 'Root', [makeNode(2, 'LayoutRoot')], null),
          contentRootId: 1,
          maxId: 2,
        }),
      });

      builder.updateTree(makeNode(6, 'Root', [makeNode(8, 'Section')], null));
      expect(builder.maxId.value).toBe(8);

      builder.updateTree(makeNode(9, 'Root', [makeNode(15, 'Column')], null));
      expect(builder.maxId.value).toBe(15);

      builder.updateTree(makeNode(1, 'Root', [makeNode(2, 'Column')], null));
      expect(builder.maxId.value).toBe(15);
    });
  });

  describe('nextId', () => {
    it('increments maxId and returns the new value', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({
          tree: makeNode(1, 'Root', [], null),
          contentRootId: 1,
          maxId: 7,
        }),
      });

      expect(builder.nextId()).toBe(8);
      expect(builder.maxId.value).toBe(8);
      expect(builder.nextId()).toBe(9);
      expect(builder.maxId.value).toBe(9);
    });
  });

  describe('snapshot and restore', () => {
    it('restores tree, contentRootId, and maxId from a snapshot', () => {
      const builder = usePageBuilder({ initialData: makeInitialData({ maxId: 2 }) });

      const snapTree = makeNode(3, 'Root', [makeNode(6, 'Hero')], null);
      builder.updateTree(snapTree);
      builder.nextId(); // maxId: 12
      const snapshot = builder.getSnapshot();

      builder.updateTree(makeNode(20, 'Root', [makeNode(31, 'Card')], null));
      builder.nextId();
      expect(builder.maxId.value).toBe(32);

      builder.restoreSnapshot(snapshot);

      expect(builder.tree.value).toEqual(snapTree);
      expect(builder.maxId.value).toBe(12);
      expect(builder.isDirty.value).toBe(true);
    });

    it('throws a standardized error when snapshot JSON is invalid', () => {
      const builder = usePageBuilder({ initialData: makeInitialData() });

      try {
        builder.restoreSnapshot('{"content":');
        throw new Error('Expected restoreSnapshot to throw for invalid JSON.');
      } catch (error) {
        expect(error).toBeInstanceOf(PageBuilderError);
        expect((error as PageBuilderError).code).toBe('INVALID_SNAPSHOT');
      }
    });

    it('throws a standardized error when snapshot shape is invalid', () => {
      const builder = usePageBuilder({ initialData: makeInitialData() });
      const invalidSnapshot = JSON.stringify({
        tree: null,
        contentRootId: null,
        maxId: 10,
      });

      try {
        builder.restoreSnapshot(invalidSnapshot);
        throw new Error('Expected restoreSnapshot to throw for invalid snapshot shape.');
      } catch (error) {
        expect(error).toBeInstanceOf(PageBuilderError);
        expect((error as PageBuilderError).code).toBe('INVALID_SNAPSHOT');
      }
    });
  });

  describe('reset', () => {
    it('restores initial mutable state and clears dirty flag', () => {
      const initialData = makeInitialData({
        maxId: 11,
        variables: { HERO_TITLE: 'Welcome', CTA_TEXT: 'Start' },
      });
      const builder = usePageBuilder({ initialData, mode: 'edit' });

      builder.updateTree(makeNode(50, 'Root', [makeNode(55, 'Hero')], null));
      builder.variables.value = { HERO_TITLE: 'Changed' };
      builder.nextId();

      builder.reset();

      expect(builder.tree.value).toEqual(initialData.tree);
      expect(builder.contentRootId.value).toBe(initialData.contentRootId);
      expect(builder.maxId.value).toBe(initialData.maxId);
      expect(builder.variables.value).toEqual(initialData.variables);
      expect(builder.pageData.value).toEqual(initialData);
      expect(builder.mode.value).toBe('edit');
      expect(builder.isDirty.value).toBe(false);
    });
  });

  describe('dirty flag behavior', () => {
    it('tracks tree changes and clears when restored to baseline', () => {
      const builder = usePageBuilder({ initialData: makeInitialData() });

      expect(builder.isDirty.value).toBe(false);

      builder.nextId();
      expect(builder.isDirty.value).toBe(false);

      const snapshot = builder.getSnapshot();
      builder.restoreSnapshot(snapshot);
      expect(builder.isDirty.value).toBe(false);

      builder.updateTree(makeNode(10, 'LayoutRoot', [makeNode(99, 'Container')], null));
      expect(builder.isDirty.value).toBe(true);

      builder.restoreSnapshot(snapshot);
      expect(builder.isDirty.value).toBe(false);

      builder.reset();
      expect(builder.isDirty.value).toBe(false);
    });
  });

  describe('defensive initialization', () => {
    it('sanitizes malformed initial payloads and keeps the builder usable', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const malformed = {
          ...makeInitialData(),
          tree: null,
          contentRootId: -1,
          maxId: -10,
          variables: { OK: 'yes', BAD: 3 },
        } as unknown as IPageData;

        const builder = usePageBuilder({ initialData: malformed });

        expect(builder.tree.value.name).toBe('PbSection');
        expect(builder.maxId.value).toBeGreaterThanOrEqual(1);
        expect(builder.variables.value).toEqual({ OK: 'yes' });
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('rejects non-integer node ids in initial payload and falls back safely', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const malformed = {
          ...makeInitialData(),
          tree: {
            id: 1.5,
            name: 'Root',
            slot: null,
            props: {},
            children: [],
          },
        } as unknown as IPageData;

        const builder = usePageBuilder({ initialData: malformed });
        expect(builder.tree.value.name).toBe('PbSection');
        expect(builder.tree.value.id).toBe(1);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
