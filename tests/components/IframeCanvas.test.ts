import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import IframeCanvas from '@/components/editor/IframeCanvas.vue';
import { registerComponent, clearRegistry } from '@/core/registry';
import { createIframeBridgePointerMessage } from '@/core/iframe-bridge';
import { useDragDrop } from '@/composables/use-drag-drop';
import { DRAG_DROP_KEY, NODE_TREE_KEY } from '@/types/keys';
import type { INode } from '@/types/node';
import type { IComponentDefinition } from '@/types/component';

const RootBox = defineComponent({
  name: 'RootBox',
  template: '<section class="root-box"><slot /></section>',
});

const ChildBox = defineComponent({
  name: 'ChildBox',
  template: '<div class="child-box">child</div>',
});

function reg(
  name: string,
  component: object,
  category: 'content' | 'layout' = 'content',
  slots: Array<{ name: string; label: string }> = [],
): void {
  registerComponent({
    name,
    label: name,
    category,
    component,
    slots,
    editableProps: [],
  } as IComponentDefinition);
}

const contentTree: INode = {
  id: 1,
  name: 'RootBox',
  slot: null,
  props: {},
  children: [
    {
      id: 2,
      name: 'ChildBox',
      slot: 'default',
      props: {},
      children: [],
    },
  ],
};

function getCanvasRoot(wrapper: ReturnType<typeof mount>): ParentNode {
  const iframe = wrapper.find('.ipb-iframe-canvas__frame');
  if (iframe.exists()) {
    const doc = (iframe.element as HTMLIFrameElement).contentDocument;
    if (doc) return doc;
  }

  const fallback = wrapper.find('.ipb-iframe-canvas__fallback');
  if (fallback.exists()) return fallback.element;

  throw new Error('Expected canvas root to exist.');
}

function getIframeElement(wrapper: ReturnType<typeof mount>, selector: string): HTMLElement {
  const element = getCanvasRoot(wrapper).querySelector(selector);
  if (!element) {
    throw new Error(`Expected canvas element matching selector "${selector}".`);
  }
  return element as HTMLElement;
}

function getCanvasContentRoot(wrapper: ReturnType<typeof mount>): HTMLElement {
  const fallbackRoot = wrapper.find('#ipb-iframe-canvas-content');
  if (fallbackRoot.exists()) {
    return fallbackRoot.element as HTMLElement;
  }
  return getIframeElement(wrapper, '#ipb-iframe-canvas-content');
}

function getWindowOrigin(targetWindow: Window): string {
  try {
    return targetWindow.location.origin;
  } catch {
    return window.location.origin;
  }
}

function dispatchDragEvent(element: Element, type: string, dataTransfer: DataTransfer) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & { dataTransfer?: DataTransfer };
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  element.dispatchEvent(event);
}

describe('IframeCanvas', () => {
  beforeEach(() => {
    clearRegistry();
    reg('RootBox', RootBox, 'layout', [{ name: 'default', label: 'Content' }]);
    reg('ChildBox', ChildBox);
  });

  it('selects and hovers nodes inside iframe content', async () => {
    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await nextTick();
    await nextTick();

    getIframeElement(wrapper, '.child-box').dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    getIframeElement(wrapper, '.child-box').dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
      }),
    );
    getCanvasContentRoot(wrapper).dispatchEvent(
      new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(wrapper.emitted('select')).toEqual([[2]]);
    expect(wrapper.emitted('hover')).toEqual([[2], [null]]);
  });

  it('opens context menu from iframe and emits context action', async () => {
    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await nextTick();
    await nextTick();

    getIframeElement(wrapper, '.child-box').dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 64,
      }),
    );
    await nextTick();
    await nextTick();

    expect(wrapper.find('.ipb-node-context-menu').exists()).toBe(true);
    expect(wrapper.emitted('select')).toEqual([[2]]);

    await wrapper.find('[data-action="duplicate"]').trigger('click');
    expect(wrapper.emitted('context-action')).toEqual([[{ action: 'duplicate', nodeId: 2 }]]);
  });

  it('disables root-only context actions that require a parent position', async () => {
    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await nextTick();
    await nextTick();

    getIframeElement(wrapper, '[data-ipb-node-id="1"]').dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 40,
        clientY: 24,
      }),
    );
    await nextTick();
    await nextTick();

    expect(wrapper.find('.ipb-node-context-menu').exists()).toBe(true);
    expect(wrapper.find('[data-action="move-up"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-action="move-down"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-action="delete"]').attributes('disabled')).toBeDefined();
  });

  it('ignores bridge pointer messages from untrusted origin', async () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await nextTick();
    await nextTick();

    const iframe = wrapper.find('.ipb-iframe-canvas__frame');
    if (!iframe.exists()) {
      expect(wrapper.find('.ipb-iframe-canvas__fallback').exists()).toBe(true);
      postMessageSpy.mockRestore();
      return;
    }

    const sessionToken = postMessageSpy.mock.calls
      .map((call) => call[0])
      .find((data): data is { sessionToken: string } => {
        if (!data || typeof data !== 'object') return false;
        const maybeToken = (data as { sessionToken?: unknown }).sessionToken;
        return typeof maybeToken === 'string' && maybeToken.length > 0;
      })?.sessionToken;

    expect(sessionToken).toBeDefined();
    if (!sessionToken) {
      postMessageSpy.mockRestore();
      throw new Error('Expected iframe bridge session token to be initialized.');
    }

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        origin: 'https://evil.example',
        data: createIframeBridgePointerMessage({ interaction: 'select', nodeId: 2 }, 'origin-mismatch-token'),
      }),
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        origin: getWindowOrigin(window),
        data: createIframeBridgePointerMessage({ interaction: 'select', nodeId: 2 }, 'wrong-session-token'),
      }),
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        origin: getWindowOrigin(window),
        data: createIframeBridgePointerMessage({ interaction: 'select', nodeId: 2 }, sessionToken),
      }),
    );

    expect(wrapper.emitted('select')).toEqual([[2]]);
    postMessageSpy.mockRestore();
  });

  it('applies restrictive iframe sandbox permissions', async () => {
    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await nextTick();
    await nextTick();

    const iframe = wrapper.find('.ipb-iframe-canvas__frame');
    if (!iframe.exists()) {
      expect(wrapper.find('.ipb-iframe-canvas__fallback').exists()).toBe(true);
      return;
    }

    expect(iframe.attributes('sandbox')).toBe('allow-same-origin');
  });

  it('emits iframe-keydown payload for shortcut handling', async () => {
    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await nextTick();
    await nextTick();

    const iframe = wrapper.find('.ipb-iframe-canvas__frame');
    const iframeDoc = iframe.exists() ? (iframe.element as HTMLIFrameElement).contentDocument : null;

    if (!iframeDoc) {
      expect(wrapper.find('.ipb-iframe-canvas__fallback').exists()).toBe(true);
      return;
    }

    iframeDoc.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Delete',
        code: 'Delete',
      }),
    );

    const input = iframeDoc.createElement('input');
    iframeDoc.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 's',
        code: 'KeyS',
        ctrlKey: true,
      }),
    );

    const keydowns = wrapper.emitted('iframe-keydown') ?? [];
    expect(keydowns).toHaveLength(2);
    expect((keydowns[0][0] as { isEditable: boolean; key: string }).isEditable).toBe(false);
    expect((keydowns[0][0] as { isEditable: boolean; key: string }).key).toBe('Delete');
    expect((keydowns[1][0] as { isEditable: boolean; key: string }).isEditable).toBe(true);
  });

  it('applies preset/custom viewport sizes and emits measured viewport size', async () => {
    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'tablet',
      },
    });

    await nextTick();
    await nextTick();

    expect(wrapper.find('.ipb-canvas__viewport').attributes('style')).toContain('1024px');
    expect(wrapper.emitted('viewport-size-change')).toBeTruthy();

    await wrapper.setProps({
      viewport: 'custom',
      viewportWidth: 420,
      viewportHeight: 680,
    });
    await nextTick();
    await nextTick();

    const customStyle = wrapper.find('.ipb-canvas__viewport').attributes('style');
    expect(customStyle).toContain('680px');
  });

  it('drops new components using iframe drag-drop handlers', async () => {
    const dragDrop = useDragDrop();
    const addNode = vi.fn(() => 42);
    const moveNodeTo = vi.fn();

    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
      global: {
        provide: {
          [DRAG_DROP_KEY as symbol]: dragDrop,
          [NODE_TREE_KEY as symbol]: { addNode, moveNodeTo },
        },
      },
    });

    await nextTick();
    await nextTick();

    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: vi.fn(),
    } as unknown as DataTransfer;

    dragDrop.startDragNew('ChildBox');
    const rootNode = getIframeElement(wrapper, '[data-ipb-node-id="1"]');
    dispatchDragEvent(rootNode, 'dragover', dataTransfer);
    dispatchDragEvent(rootNode, 'drop', dataTransfer);
    await nextTick();

    expect(addNode).toHaveBeenCalledWith(1, 'ChildBox', 1, 'default', undefined);
    expect(moveNodeTo).not.toHaveBeenCalled();
    expect(wrapper.emitted('select')).toContainEqual([42]);
  });

  it('does not emit selection when iframe insertion fails', async () => {
    const dragDrop = useDragDrop();
    const addNode = vi.fn(() => null);
    const moveNodeTo = vi.fn();

    const wrapper = mount(IframeCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
      global: {
        provide: {
          [DRAG_DROP_KEY as symbol]: dragDrop,
          [NODE_TREE_KEY as symbol]: { addNode, moveNodeTo },
        },
      },
    });

    await nextTick();
    await nextTick();

    const dataTransfer = {
      effectAllowed: 'none',
      dropEffect: 'none',
      setData: vi.fn(),
    } as unknown as DataTransfer;

    dragDrop.startDragNew('ChildBox');
    const rootNode = getIframeElement(wrapper, '[data-ipb-node-id="1"]');
    dispatchDragEvent(rootNode, 'dragover', dataTransfer);
    dispatchDragEvent(rootNode, 'drop', dataTransfer);
    await nextTick();

    expect(addNode).toHaveBeenCalledWith(1, 'ChildBox', 1, 'default', undefined);
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(moveNodeTo).not.toHaveBeenCalled();
  });
});
