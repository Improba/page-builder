import { nextTick, defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import type { INode, IPageData } from '@/types/node';

type MockPageBuilder = {
  tree: { value: INode };
  contentRoot: { value: INode };
  contentRootId: { value: number };
  maxId: { value: number };
  variables: { value: Record<string, string> };
  isDirty: { value: boolean };
  nextId: () => number;
  getSnapshot: () => string;
  restoreSnapshot: (snapshot: string) => void;
  updateTree: (newTree: INode) => void;
};

type MockEditor = {
  selectedNodeId: { value: number | null };
  hoveredNodeId: { value: number | null };
  leftDrawerOpen: { value: boolean };
  rightDrawerOpen: { value: boolean };
  viewport: { value: 'desktop' | 'tablet' | 'mobile' | 'custom' };
  canUndo: { value: boolean };
  canRedo: { value: boolean };
  selectNode: (id: number | null) => void;
  hoverNode: (id: number | null) => void;
  toggleLeftDrawer: () => void;
  toggleRightDrawer: () => void;
  setViewport: (preset: 'desktop' | 'tablet' | 'mobile' | 'custom') => void;
  setHistoryBaseline: (snapshot: string, label?: string) => void;
  pushHistory: (label: string, snapshot: string) => void;
  undo: () => string | undefined;
  redo: () => string | undefined;
};

const mockState = vi.hoisted(() => ({
  pageBuilder: null as MockPageBuilder | null,
  editor: null as MockEditor | null,
  deleteNodeSpy: null as ReturnType<typeof vi.fn> | null,
  duplicateNodeSpy: null as ReturnType<typeof vi.fn> | null,
  moveNodeUpSpy: null as ReturnType<typeof vi.fn> | null,
  moveNodeDownSpy: null as ReturnType<typeof vi.fn> | null,
  canMoveNodeUpSpy: null as ReturnType<typeof vi.fn> | null,
  canMoveNodeDownSpy: null as ReturnType<typeof vi.fn> | null,
}));

vi.mock('@/composables/use-page-builder', async () => {
  const vue = await import('vue');
  const { ref, computed } = vue;

  function findNode(node: INode, id: number): INode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  return {
    usePageBuilder: vi.fn((options: { initialData: IPageData }) => {
      const tree = ref(JSON.parse(JSON.stringify(options.initialData.tree)) as INode);
      const contentRootId = ref(options.initialData.contentRootId);
      const contentRoot = computed(() => findNode(tree.value, contentRootId.value) ?? tree.value);
      const maxId = ref(options.initialData.maxId);
      const variables = ref({ ...options.initialData.variables });
      const isDirty = ref(false);

      const pb: MockPageBuilder = {
        tree,
        contentRoot,
        contentRootId,
        maxId,
        variables,
        isDirty,
        nextId: () => ++maxId.value,
        getSnapshot: () => JSON.stringify(tree.value),
        restoreSnapshot: (snapshot) => {
          tree.value = JSON.parse(snapshot) as INode;
        },
        updateTree: (newTree) => {
          tree.value = newTree;
        },
      };

      mockState.pageBuilder = pb;
      return pb;
    }),
  };
});

vi.mock('@/composables/use-editor', async () => {
  const vue = await import('vue');
  const { computed, ref } = vue;

  return {
    useEditor: vi.fn((options?: { initialSnapshot?: string }) => {
      const selectedNodeId = ref<number | null>(null);
      const hoveredNodeId = ref<number | null>(null);
      const leftDrawerOpen = ref(true);
      const rightDrawerOpen = ref(false);
      const viewport = ref<'desktop' | 'tablet' | 'mobile' | 'custom'>('desktop');

      const history = ref<string[]>(options?.initialSnapshot ? [options.initialSnapshot] : []);
      const historyIndex = ref(history.value.length > 0 ? 0 : -1);

      const canUndo = computed(() => historyIndex.value > 0);
      const canRedo = computed(() => historyIndex.value < history.value.length - 1);

      const editor: MockEditor = {
        selectedNodeId,
        hoveredNodeId,
        leftDrawerOpen,
        rightDrawerOpen,
        viewport,
        canUndo,
        canRedo,
        selectNode: (id) => {
          selectedNodeId.value = id;
          if (id !== null) rightDrawerOpen.value = true;
        },
        hoverNode: (id) => {
          hoveredNodeId.value = id;
        },
        toggleLeftDrawer: () => {
          leftDrawerOpen.value = !leftDrawerOpen.value;
        },
        toggleRightDrawer: () => {
          rightDrawerOpen.value = !rightDrawerOpen.value;
        },
        setViewport: (preset) => {
          viewport.value = preset;
        },
        setHistoryBaseline: (snapshot) => {
          history.value = [snapshot];
          historyIndex.value = 0;
        },
        pushHistory: (_label, snapshot) => {
          if (historyIndex.value < 0) {
            history.value = [snapshot];
            historyIndex.value = 0;
            return;
          }

          if (historyIndex.value < history.value.length - 1) {
            history.value.splice(historyIndex.value + 1);
          }
          if (history.value[historyIndex.value] === snapshot) return;
          history.value.push(snapshot);
          historyIndex.value = history.value.length - 1;
        },
        undo: () => {
          if (!canUndo.value) return undefined;
          historyIndex.value--;
          return history.value[historyIndex.value];
        },
        redo: () => {
          if (!canRedo.value) return undefined;
          historyIndex.value++;
          return history.value[historyIndex.value];
        },
      };

      mockState.editor = editor;
      return editor;
    }),
  };
});

vi.mock('@/composables/use-node-tree', () => {
  function findNodeById(root: INode, id: number): INode | null {
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  }

  function removeNodeById(root: INode, id: number): boolean {
    const index = root.children.findIndex((child) => child.id === id);
    if (index >= 0) {
      root.children.splice(index, 1);
      return true;
    }
    return root.children.some((child) => removeNodeById(child, id));
  }

  function findParentById(root: INode, id: number): { parent: INode; index: number } | null {
    const index = root.children.findIndex((child) => child.id === id);
    if (index >= 0) return { parent: root, index };
    for (const child of root.children) {
      const found = findParentById(child, id);
      if (found) return found;
    }
    return null;
  }

  return {
    useNodeTree: vi.fn((options: { tree: { value: INode }; onUpdate: (tree: INode) => void; onSnapshot?: (label: string) => void }) => ({
      addNode: vi.fn(),
      moveNodeTo: vi.fn(),
      duplicateNode: (() => {
        const spy = vi.fn();
        mockState.duplicateNodeSpy = spy;
        return spy;
      })(),
      deleteNode: (() => {
        const spy = vi.fn((nodeId: number) => {
          const cloned = JSON.parse(JSON.stringify(options.tree.value)) as INode;
          removeNodeById(cloned, nodeId);
          options.onUpdate(cloned);
          options.onSnapshot?.('Delete node');
        });
        mockState.deleteNodeSpy = spy;
        return spy;
      })(),
      canMoveNodeUp: (() => {
        const spy = vi.fn((nodeId: number) => {
          const node = findNodeById(options.tree.value, nodeId);
          if (!node || node.readonly) return false;
          const parentResult = findParentById(options.tree.value, nodeId);
          return parentResult !== null && parentResult.index > 0;
        });
        mockState.canMoveNodeUpSpy = spy;
        return spy;
      })(),
      canMoveNodeDown: (() => {
        const spy = vi.fn((nodeId: number) => {
          const node = findNodeById(options.tree.value, nodeId);
          if (!node || node.readonly) return false;
          const parentResult = findParentById(options.tree.value, nodeId);
          return parentResult !== null && parentResult.index < parentResult.parent.children.length - 1;
        });
        mockState.canMoveNodeDownSpy = spy;
        return spy;
      })(),
      moveNodeUp: (() => {
        const spy = vi.fn((nodeId: number) => {
          const cloned = JSON.parse(JSON.stringify(options.tree.value)) as INode;
          const parentResult = findParentById(cloned, nodeId);
          if (!parentResult || parentResult.index <= 0) return;
          const [node] = parentResult.parent.children.splice(parentResult.index, 1);
          parentResult.parent.children.splice(parentResult.index - 1, 0, node);
          options.onUpdate(cloned);
          options.onSnapshot?.('Move node up');
        });
        mockState.moveNodeUpSpy = spy;
        return spy;
      })(),
      moveNodeDown: (() => {
        const spy = vi.fn((nodeId: number) => {
          const cloned = JSON.parse(JSON.stringify(options.tree.value)) as INode;
          const parentResult = findParentById(cloned, nodeId);
          if (!parentResult || parentResult.index >= parentResult.parent.children.length - 1) return;
          const [node] = parentResult.parent.children.splice(parentResult.index, 1);
          parentResult.parent.children.splice(parentResult.index + 1, 0, node);
          options.onUpdate(cloned);
          options.onSnapshot?.('Move node down');
        });
        mockState.moveNodeDownSpy = spy;
        return spy;
      })(),
      updateNodeProps: vi.fn((nodeId: number, props: Record<string, unknown>) => {
        const cloned = JSON.parse(JSON.stringify(options.tree.value)) as INode;
        const node = findNodeById(cloned, nodeId);
        if (node) {
          node.props = { ...node.props, ...props };
        }
        options.onUpdate(cloned);
        options.onSnapshot?.('Update props');
      }),
    })),
  };
});

vi.mock('@/composables/use-drag-drop', () => ({
  useDragDrop: vi.fn(() => ({
    startDragNew: vi.fn(),
    cancelDrag: vi.fn(),
  })),
}));

import PageEditor from '@/components/editor/PageEditor.vue';

const StubLeftDrawer = defineComponent({
  name: 'LeftDrawer',
  props: ['open', 'content', 'selectedNodeId'],
  emits: ['toggle', 'drag-start', 'drag-end', 'select'],
  template: `
    <div class="stub-left-drawer">
      <button class="select-from-tree" @click="$emit('select', 2)">Select from tree</button>
    </div>
  `,
});

const StubIframeCanvas = defineComponent({
  name: 'IframeCanvas',
  props: ['content', 'variables', 'selectedNodeId', 'hoveredNodeId', 'viewport', 'viewportWidth', 'viewportHeight'],
  emits: ['select', 'hover', 'context-action', 'iframe-keydown', 'viewport-size-change'],
  template: `
    <div class="stub-editor-canvas">
      <button class="select-node" @click="$emit('select', 2)">Select node</button>
      <button class="ctx-duplicate" @click="$emit('context-action', { action: 'duplicate', nodeId: 2 })">Ctx duplicate</button>
      <button class="ctx-delete" @click="$emit('context-action', { action: 'delete', nodeId: 2 })">Ctx delete</button>
      <button class="ctx-delete-readonly" @click="$emit('context-action', { action: 'delete', nodeId: 4 })">Ctx delete readonly</button>
      <button class="ctx-move-up" @click="$emit('context-action', { action: 'move-up', nodeId: 3 })">Ctx move up</button>
      <button class="ctx-move-down" @click="$emit('context-action', { action: 'move-down', nodeId: 2 })">Ctx move down</button>
    </div>
  `,
});

const StubRightDrawer = defineComponent({
  name: 'RightDrawer',
  props: ['open', 'selectedNodeId', 'content'],
  emits: ['toggle', 'update-props', 'delete', 'duplicate'],
  template: `
    <div class="stub-right-drawer">
      <button class="update-node" @click="$emit('update-props', 2, { text: 'Updated' })">Update</button>
    </div>
  `,
});

function makePageData(): IPageData {
  return {
    meta: {
      id: 'page-shortcuts',
      name: 'Keyboard Shortcuts',
      url: '/keyboard-shortcuts',
      status: 'draft',
    },
    tree: {
      id: 1,
      name: 'PbSection',
      slot: null,
      props: {},
      children: [
        {
          id: 2,
          name: 'PbText',
          slot: 'default',
          props: { text: 'Hello' },
          children: [],
        },
      ],
    },
    contentRootId: 1,
    maxId: 2,
    variables: {},
  };
}

function makeContextPageData(): IPageData {
  return {
    meta: {
      id: 'page-context',
      name: 'Context Menu',
      url: '/context-menu',
      status: 'draft',
    },
    tree: {
      id: 1,
      name: 'PbSection',
      slot: null,
      props: {},
      children: [
        {
          id: 2,
          name: 'PbText',
          slot: 'default',
          props: { text: 'First' },
          children: [],
        },
        {
          id: 3,
          name: 'PbText',
          slot: 'default',
          props: { text: 'Second' },
          children: [],
        },
        {
          id: 4,
          name: 'PbText',
          slot: 'default',
          props: { text: 'Readonly' },
          readonly: true,
          children: [],
        },
      ],
    },
    contentRootId: 1,
    maxId: 4,
    variables: {},
  };
}

function mountEditor(pageData: IPageData = makePageData()) {
  return mount(PageEditor, {
    props: {
      pageData,
    },
    global: {
      stubs: {
        LeftDrawer: StubLeftDrawer,
        IframeCanvas: StubIframeCanvas,
        RightDrawer: StubRightDrawer,
      },
    },
  });
}

function dispatchKeydown(init: KeyboardEventInit & { key: string }) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

describe('PageEditor keyboard shortcuts', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('selects a node from left drawer tree events', async () => {
    const wrapper = mountEditor(makeContextPageData());

    try {
      await wrapper.find('.select-from-tree').trigger('click');
      await nextTick();

      expect(mockState.editor?.selectedNodeId.value).toBe(2);
      expect(mockState.editor?.rightDrawerOpen.value).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('handles save via shortcut and toolbar button', async () => {
    const wrapper = mountEditor();

    try {
      dispatchKeydown({ key: 's', ctrlKey: true });
      await nextTick();

      expect(wrapper.emitted('save')).toHaveLength(1);

      await wrapper.find('.ipb-toolbar__btn--primary').trigger('click');

      expect(wrapper.emitted('save')).toHaveLength(2);
    } finally {
      wrapper.unmount();
    }
  });

  it('maps delete, undo, and redo shortcuts to editor actions', async () => {
    const wrapper = mountEditor();

    try {
      await wrapper.find('.update-node').trigger('click');
      mockState.editor?.selectNode(2);
      await nextTick();
      expect(mockState.editor?.selectedNodeId.value).toBe(2);

      dispatchKeydown({ key: 'Delete', code: 'Delete' });
      await nextTick();
      expect(mockState.deleteNodeSpy).toHaveBeenCalledWith(2);
      expect(mockState.pageBuilder?.tree.value.children).toHaveLength(0);

      dispatchKeydown({ key: 'z', ctrlKey: true });
      await nextTick();
      expect(mockState.pageBuilder?.tree.value.children).toHaveLength(1);

      dispatchKeydown({ key: 'Z', ctrlKey: true, shiftKey: true });
      await nextTick();
      expect(mockState.pageBuilder?.tree.value.children).toHaveLength(0);

      dispatchKeydown({ key: 'z', ctrlKey: true });
      await nextTick();
      expect(mockState.pageBuilder?.tree.value.children).toHaveLength(1);

      dispatchKeydown({ key: 'y', ctrlKey: true });
      await nextTick();
      expect(mockState.pageBuilder?.tree.value.children).toHaveLength(0);
    } finally {
      wrapper.unmount();
    }
  });

  it('supports undo/redo from the first mutation via baseline snapshot', async () => {
    const wrapper = mountEditor();

    try {
      await wrapper.find('.update-node').trigger('click');
      expect(mockState.pageBuilder?.tree.value.children[0]?.props.text).toBe('Updated');

      dispatchKeydown({ key: 'z', ctrlKey: true });
      await nextTick();
      expect(mockState.pageBuilder?.tree.value.children[0]?.props.text).toBe('Hello');

      await wrapper.find('button[title^="Redo"]').trigger('click');
      await nextTick();
      expect(mockState.pageBuilder?.tree.value.children[0]?.props.text).toBe('Updated');
    } finally {
      wrapper.unmount();
    }
  });

  it('skips undo snapshot when restore throws and reports diagnostics', async () => {
    const wrapper = mountEditor();

    try {
      await wrapper.find('.update-node').trigger('click');
      await nextTick();
      expect(mockState.pageBuilder?.tree.value.children[0]?.props.text).toBe('Updated');

      const restoreSpy = vi.fn(() => {
        throw new Error('Invalid snapshot payload');
      });
      if (!mockState.pageBuilder) {
        throw new Error('Expected mock page builder to exist.');
      }
      mockState.pageBuilder.restoreSnapshot = restoreSpy;

      dispatchKeydown({ key: 'z', ctrlKey: true });
      await nextTick();

      expect(restoreSpy).toHaveBeenCalledTimes(1);
      expect(mockState.pageBuilder.tree.value.children[0]?.props.text).toBe('Updated');
      const diagnostics = consoleErrorSpy.mock.calls.map((call) => String(call[0] ?? ''));
      expect(
        diagnostics.some((message) =>
          message.includes('Failed to apply history snapshot. Undo/redo step was skipped.'),
        ),
      ).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('ignores shortcuts while typing in editable fields', async () => {
    const wrapper = mountEditor();
    try {
      mockState.editor?.selectNode(2);
      await nextTick();

      const input = document.createElement('input');
      const textarea = document.createElement('textarea');
      const contentEditable = document.createElement('div');
      contentEditable.setAttribute('contenteditable', 'true');
      const editableElements = [input, textarea, contentEditable];

      editableElements.forEach((element) => document.body.appendChild(element));

      for (const element of editableElements) {
        element.focus();

        dispatchKeydown({ key: 's', ctrlKey: true });
        dispatchKeydown({ key: 'Delete', code: 'Delete' });
        await nextTick();
      }

      expect(wrapper.emitted('save')).toBeUndefined();
      expect(mockState.pageBuilder?.tree.value.children).toHaveLength(1);
    } finally {
      document.querySelectorAll('input, textarea, [contenteditable]').forEach((element) => element.remove());
      wrapper.unmount();
    }
  });

  it('routes context actions to node-tree operations and respects readonly', async () => {
    const wrapper = mountEditor(makeContextPageData());

    try {
      await wrapper.find('.ctx-duplicate').trigger('click');
      await wrapper.find('.ctx-move-up').trigger('click');
      await wrapper.find('.ctx-move-down').trigger('click');
      await wrapper.find('.ctx-delete').trigger('click');
      await wrapper.find('.ctx-delete-readonly').trigger('click');
      await nextTick();

      expect(mockState.duplicateNodeSpy).toHaveBeenCalledWith(2);
      expect(mockState.canMoveNodeUpSpy).toHaveBeenCalledWith(3);
      expect(mockState.moveNodeUpSpy).toHaveBeenCalledWith(3);
      expect(mockState.canMoveNodeDownSpy).toHaveBeenCalledWith(2);
      expect(mockState.moveNodeDownSpy).toHaveBeenCalledWith(2);
      expect(mockState.deleteNodeSpy).toHaveBeenCalledTimes(1);
      expect(mockState.deleteNodeSpy).toHaveBeenCalledWith(2);
    } finally {
      wrapper.unmount();
    }
  });

  it('syncs custom viewport controls to iframe dimensions', async () => {
    const wrapper = mountEditor();

    try {
      const iframeCanvas = wrapper.findComponent(StubIframeCanvas);
      iframeCanvas.vm.$emit('viewport-size-change', { width: 910, height: 650 });
      await nextTick();

      const customViewportButton = wrapper
        .findAll('.ipb-toolbar__btn')
        .find((button) => button.text() === 'Custom');
      expect(customViewportButton).toBeDefined();

      if (!customViewportButton) {
        throw new Error('Expected custom viewport button to exist.');
      }

      await customViewportButton.trigger('click');
      await nextTick();

      expect(iframeCanvas.props('viewport')).toBe('custom');
      expect(iframeCanvas.props('viewportWidth')).toBe(910);
      expect(iframeCanvas.props('viewportHeight')).toBe(650);
      expect(wrapper.text()).toContain('910×650');

      const sizeInputs = wrapper.findAll('.ipb-toolbar__size-input');
      expect(sizeInputs).toHaveLength(2);

      await sizeInputs[0].setValue('500');
      await sizeInputs[1].setValue('700');
      await nextTick();

      expect(iframeCanvas.props('viewportWidth')).toBe(500);
      expect(iframeCanvas.props('viewportHeight')).toBe(700);
    } finally {
      wrapper.unmount();
    }
  });
});
