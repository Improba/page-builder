import { mount, type VueWrapper } from '@vue/test-utils';
import { markRaw, nextTick } from 'vue';
import PageEditor from '@/components/editor/PageEditor.vue';
import { builtInComponents } from '@/built-in';
import { clearRegistry, registerComponents } from '@/core/registry';
import type { INode, IPageData, IPageSavePayload } from '@/types/node';

function makePageData(): IPageData {
  return {
    meta: {
      id: 'page-integration',
      name: 'Editor Integration',
      url: '/editor-integration',
      status: 'draft',
    },
    tree: {
      id: 1,
      name: 'PbSection',
      slot: null,
      props: {
        backgroundColor: 'transparent',
      },
      children: [
        {
          id: 2,
          name: 'PbText',
          slot: 'default',
          props: {
            content: '<p>Initial text</p>',
            tag: 'div',
          },
          children: [],
        },
      ],
    },
    contentRootId: 1,
    maxId: 2,
    variables: {},
  };
}

function mountEditor(pageData: IPageData = makePageData()) {
  return mount(PageEditor, {
    props: {
      pageData: markRaw(pageData),
    },
  });
}

function getLastChangeTree(wrapper: VueWrapper): INode {
  const changes = wrapper.emitted('change');
  if (!changes || changes.length === 0) {
    throw new Error('Expected PageEditor to emit at least one "change" event.');
  }

  return changes[changes.length - 1][0] as INode;
}

function getCanvasRoot(wrapper: VueWrapper): ParentNode {
  const iframe = wrapper.find('.ipb-iframe-canvas__frame');
  if (iframe.exists()) {
    const doc = (iframe.element as HTMLIFrameElement).contentDocument;
    if (doc) return doc;
  }

  const fallback = wrapper.find('.ipb-iframe-canvas__fallback');
  if (fallback.exists()) {
    return fallback.element;
  }

  throw new Error('Expected canvas root to be available.');
}

async function waitForCanvasReady(wrapper: VueWrapper) {
  for (let i = 0; i < 8; i++) {
    const iframe = wrapper.find('.ipb-iframe-canvas__frame');
    if (iframe.exists() && (iframe.element as HTMLIFrameElement).contentDocument) {
      return;
    }

    if (wrapper.find('#ipb-iframe-canvas-content').exists()) {
      return;
    }

    await nextTick();
  }

  throw new Error('Expected canvas to become ready.');
}

function queryCanvasElement(wrapper: VueWrapper, selector: string): Element | null {
  return getCanvasRoot(wrapper).querySelector(selector);
}

function getCanvasElement(wrapper: VueWrapper, selector: string): HTMLElement {
  const element = queryCanvasElement(wrapper, selector);
  if (!element) {
    throw new Error(`Expected to find canvas element matching selector "${selector}".`);
  }
  return element as HTMLElement;
}

function dispatchCanvasDragEvent(element: Element, type: string, dataTransfer: DataTransfer) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & { dataTransfer?: DataTransfer };
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  element.dispatchEvent(event);
}

function getViewportButton(wrapper: VueWrapper, label: string) {
  const button = wrapper.findAll('.ipb-toolbar__btn').find((item) => item.text() === label);
  if (!button) {
    throw new Error(`Expected viewport button "${label}" to exist.`);
  }
  return button;
}

async function updateContentProp(wrapper: VueWrapper, html: string) {
  const contentEditor = wrapper.get('[data-prop-key="content"] .ipb-richtext-editor__content').element as HTMLDivElement;
  contentEditor.innerHTML = html;
  contentEditor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  await nextTick();
}

async function expandPaletteCategories(wrapper: VueWrapper) {
  const toggles = wrapper.findAll('.ipb-left-drawer__category-toggle');
  for (const toggle of toggles) {
    await toggle.trigger('click');
  }
}

async function dragPaletteTextToRoot(wrapper: VueWrapper): Promise<number> {
  await expandPaletteCategories(wrapper);
  const textItem = wrapper
    .findAll('.ipb-left-drawer__component-item')
    .find((item) => item.text().includes('Text'));

  expect(textItem).toBeDefined();
  if (!textItem) {
    throw new Error('Unable to find "Text" component in left drawer.');
  }

  const dataTransfer = {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData: vi.fn(),
  } as unknown as DataTransfer;

  await textItem.trigger('dragstart', { dataTransfer });
  await nextTick();
  await waitForCanvasReady(wrapper);

  const rootNode = getCanvasElement(wrapper, '[data-ipb-node-id="1"]');
  dispatchCanvasDragEvent(rootNode, 'dragover', dataTransfer);
  await nextTick();
  expect(wrapper.find('.ipb-canvas__overlay--drop').exists()).toBe(true);

  dispatchCanvasDragEvent(rootNode, 'drop', dataTransfer);
  await nextTick();
  await nextTick();

  const changedTree = getLastChangeTree(wrapper);
  const newNode = changedTree.children[changedTree.children.length - 1];

  expect(newNode).toBeDefined();
  if (!newNode) {
    throw new Error('Expected a node to be added to content tree.');
  }

  return newNode.id;
}

async function clickPaletteTextToRoot(wrapper: VueWrapper): Promise<number> {
  await expandPaletteCategories(wrapper);
  const textItem = wrapper
    .findAll('.ipb-left-drawer__component-item')
    .find((item) => item.text().includes('Text'));

  expect(textItem).toBeDefined();
  if (!textItem) {
    throw new Error('Unable to find "Text" component in left drawer.');
  }

  await textItem.trigger('click');
  await nextTick();
  await nextTick();

  const changedTree = getLastChangeTree(wrapper);
  const newNode = changedTree.children[changedTree.children.length - 1];

  expect(newNode).toBeDefined();
  if (!newNode) {
    throw new Error('Expected a node to be added to content tree.');
  }

  return newNode.id;
}

describe('Editor integration', () => {
  beforeEach(() => {
    clearRegistry();
    registerComponents(builtInComponents);
  });

  afterEach(() => {
    clearRegistry();
  });

  it('adds a component from palette via click for keyboard-only workflow', async () => {
    const wrapper = mountEditor();

    try {
      const newNodeId = await clickPaletteTextToRoot(wrapper);
      expect(queryCanvasElement(wrapper, `[data-ipb-node-id="${newNodeId}"]`)).not.toBeNull();
    } finally {
      wrapper.unmount();
    }
  });

  it('adds a component from palette via drag-drop and keeps overlays/context menu wired', async () => {
    const wrapper = mountEditor();

    try {
      const newNodeId = await dragPaletteTextToRoot(wrapper);

      expect(queryCanvasElement(wrapper, `[data-ipb-node-id="${newNodeId}"]`)).not.toBeNull();

      getCanvasElement(wrapper, `[data-ipb-node-id="${newNodeId}"]`).dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 120,
          clientY: 80,
        }),
      );
      await nextTick();
      await nextTick();
      expect(wrapper.find('.ipb-node-context-menu').exists()).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('edits props from right drawer and updates rendered content', async () => {
    const wrapper = mountEditor();

    try {
      await waitForCanvasReady(wrapper);
      getCanvasElement(wrapper, '[data-ipb-node-id="2"]').dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      await nextTick();

      await updateContentProp(wrapper, '<p>Updated from integration test</p>');

      const changedTree = getLastChangeTree(wrapper);
      expect(changedTree.children[0]).toMatchObject({
        id: 2,
        name: 'PbText',
        props: {
          content: '<p>Updated from integration test</p>',
        },
      });
      await nextTick();
      await nextTick();
      expect(getCanvasElement(wrapper, '[data-ipb-node-id="2"]').innerHTML).toContain('Updated from integration test');
    } finally {
      wrapper.unmount();
    }
  });

  it('supports undo/redo after snapshot-producing mutations', async () => {
    const wrapper = mountEditor();

    try {
      const undoButton = wrapper.get('button[title^="Undo"]');
      const redoButton = wrapper.get('button[title^="Redo"]');
      expect(undoButton.attributes('disabled')).toBeDefined();

      await waitForCanvasReady(wrapper);
      getCanvasElement(wrapper, '[data-ipb-node-id="2"]').dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      await nextTick();
      await updateContentProp(wrapper, '<p>Snapshot text</p>');

      expect(undoButton.attributes('disabled')).toBeUndefined();

      await undoButton.trigger('click');
      await nextTick();
      expect(getCanvasElement(wrapper, '[data-ipb-node-id="2"]').innerHTML).toContain('Initial text');
      expect(redoButton.attributes('disabled')).toBeUndefined();

      await redoButton.trigger('click');
      await nextTick();
      expect(getCanvasElement(wrapper, '[data-ipb-node-id="2"]').innerHTML).toContain('Snapshot text');
    } finally {
      wrapper.unmount();
    }
  });

  it('resizes iframe viewport for presets/custom and keeps selection overlay aligned', async () => {
    const wrapper = mountEditor();

    try {
      await waitForCanvasReady(wrapper);

      getCanvasElement(wrapper, '[data-ipb-node-id="2"]').dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      await nextTick();
      await nextTick();

      await getViewportButton(wrapper, 'Tablet').trigger('click');
      await nextTick();
      await nextTick();

      const tabletStyle = wrapper.find('.ipb-canvas__viewport').attributes('style');
      expect(tabletStyle).toContain('1024px');

      await getViewportButton(wrapper, 'Custom').trigger('click');
      await nextTick();

      const sizeInputs = wrapper.findAll('.ipb-toolbar__size-input');
      expect(sizeInputs).toHaveLength(2);
      await sizeInputs[0].setValue('420');
      await sizeInputs[1].setValue('680');
      await nextTick();
      await nextTick();

      const customStyle = wrapper.find('.ipb-canvas__viewport').attributes('style');
      expect(customStyle).toContain('680px');

      getCanvasElement(wrapper, '[data-ipb-node-id="2"]').dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 96,
          clientY: 48,
        }),
      );
      await nextTick();
      await nextTick();
      expect(wrapper.find('.ipb-node-context-menu').exists()).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('emits save payload with current content and maxId', async () => {
    const wrapper = mountEditor();

    try {
      const addedNodeId = await dragPaletteTextToRoot(wrapper);

      await waitForCanvasReady(wrapper);
      getCanvasElement(wrapper, '[data-ipb-node-id="2"]').dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }),
      );
      await nextTick();
      await updateContentProp(wrapper, '<p>Save payload text</p>');

      await wrapper.get('.ipb-toolbar__btn--primary').trigger('click');

      const saves = wrapper.emitted('save');
      expect(saves).toHaveLength(1);

      const payload = saves?.[0]?.[0] as IPageSavePayload;
      expect(payload.maxId).toBe(addedNodeId);
      expect(payload.content.children).toHaveLength(2);
      expect(payload.content.children[0]).toMatchObject({
        id: 2,
        name: 'PbText',
        props: { content: '<p>Save payload text</p>' },
      });
      expect(payload.content.children[1]).toMatchObject({
        id: addedNodeId,
        name: 'PbText',
      });
    } finally {
      wrapper.unmount();
    }
  });
});
