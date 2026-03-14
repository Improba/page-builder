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
    content: makeNode(1, 'Root', [makeNode(2, 'Text')], null),
    layout: makeNode(10, 'LayoutRoot', [makeNode(11, 'Container')], null),
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
      expect(builder.content.value).toEqual(initialData.content);
      expect(builder.layout.value).toEqual(initialData.layout);
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

    it('normalizes initial maxId to cover content/layout trees', () => {
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

  describe('updateContent', () => {
    it('updates content, bumps maxId from content tree, and marks dirty', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({ maxId: 3 }),
      });
      const newContent = makeNode(4, 'Root', [makeNode(12, 'Hero')], null);

      builder.updateContent(newContent);

      expect(builder.content.value).toEqual(newContent);
      expect(builder.maxId.value).toBe(12);
      expect(builder.isDirty.value).toBe(true);
    });
  });

  describe('maxId updates', () => {
    it('never decreases maxId when updates contain lower IDs', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({ maxId: 25 }),
      });
      const lowIdContent = makeNode(1, 'Root', [makeNode(2, 'Text')], null);

      builder.updateContent(lowIdContent);

      expect(builder.maxId.value).toBe(25);
    });

    it('tracks the highest id across content and layout updates', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({
          content: makeNode(1, 'Root', [], null),
          layout: makeNode(2, 'LayoutRoot', [], null),
          maxId: 2,
        }),
      });

      builder.updateContent(makeNode(6, 'Root', [makeNode(8, 'Section')], null));
      expect(builder.maxId.value).toBe(8);

      builder.updateLayout(makeNode(9, 'LayoutRoot', [makeNode(15, 'Column')], null));
      expect(builder.maxId.value).toBe(15);

      builder.updateLayout(makeNode(1, 'LayoutRoot', [makeNode(2, 'Column')], null));
      expect(builder.maxId.value).toBe(15);
    });
  });

  describe('nextId', () => {
    it('increments maxId and returns the new value', () => {
      const builder = usePageBuilder({
        initialData: makeInitialData({
          content: makeNode(1, 'Root', [], null),
          layout: makeNode(2, 'LayoutRoot', [], null),
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
    it('restores content, layout, and maxId from a snapshot', () => {
      const builder = usePageBuilder({ initialData: makeInitialData({ maxId: 2 }) });

      const snapContent = makeNode(3, 'Root', [makeNode(6, 'Hero')], null);
      const snapLayout = makeNode(4, 'LayoutRoot', [makeNode(7, 'Wrapper')], null);
      builder.updateContent(snapContent);
      builder.updateLayout(snapLayout);
      builder.nextId(); // maxId: 8
      const snapshot = builder.getSnapshot();

      builder.updateContent(makeNode(20, 'Root', [makeNode(21, 'Card')], null));
      builder.updateLayout(makeNode(30, 'LayoutRoot', [makeNode(31, 'Grid')], null));
      builder.nextId();
      expect(builder.maxId.value).toBe(32);

      builder.restoreSnapshot(snapshot);

      expect(builder.content.value).toEqual(snapContent);
      expect(builder.layout.value).toEqual(snapLayout);
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
        content: null,
        layout: null,
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

      builder.updateContent(makeNode(50, 'Root', [makeNode(55, 'Hero')], null));
      builder.updateLayout(makeNode(70, 'LayoutRoot', [makeNode(75, 'Row')], null));
      builder.variables.value = { HERO_TITLE: 'Changed' };
      builder.nextId();

      builder.reset();

      expect(builder.content.value).toEqual(initialData.content);
      expect(builder.layout.value).toEqual(initialData.layout);
      expect(builder.maxId.value).toBe(initialData.maxId);
      expect(builder.variables.value).toEqual(initialData.variables);
      expect(builder.pageData.value).toEqual(initialData);
      expect(builder.mode.value).toBe('edit');
      expect(builder.isDirty.value).toBe(false);
    });
  });

  describe('dirty flag behavior', () => {
    it('tracks content/layout changes and clears when restored to baseline', () => {
      const builder = usePageBuilder({ initialData: makeInitialData() });

      expect(builder.isDirty.value).toBe(false);

      builder.nextId();
      expect(builder.isDirty.value).toBe(false);

      const snapshot = builder.getSnapshot();
      builder.restoreSnapshot(snapshot);
      expect(builder.isDirty.value).toBe(false);

      builder.updateLayout(makeNode(10, 'LayoutRoot', [makeNode(99, 'Container')], null));
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
          content: null,
          layout: { id: 2, name: '', slot: null, props: {}, children: [] },
          maxId: -10,
          variables: { OK: 'yes', BAD: 3 },
        } as unknown as IPageData;

        const builder = usePageBuilder({ initialData: malformed });

        expect(builder.content.value.name).toBe('PbSection');
        expect(builder.layout.value.name).toBe('PbContainer');
        expect(builder.maxId.value).toBeGreaterThanOrEqual(100);
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
          content: {
            id: 1.5,
            name: 'Root',
            slot: null,
            props: {},
            children: [],
          },
        } as unknown as IPageData;

        const builder = usePageBuilder({ initialData: malformed });
        expect(builder.content.value.name).toBe('PbSection');
        expect(builder.content.value.id).toBe(1);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});
