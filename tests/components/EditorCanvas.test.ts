import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import EditorCanvas from '@/components/editor/EditorCanvas.vue';
import { registerComponent, clearRegistry } from '@/core/registry';
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

const siblingTree: INode = {
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
    {
      id: 3,
      name: 'ChildBox',
      slot: 'default',
      props: {},
      children: [],
    },
  ],
};

const readonlyTree: INode = {
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
      readonly: true,
      children: [],
    },
  ],
};

describe('EditorCanvas', () => {
  beforeEach(() => {
    clearRegistry();
    reg('RootBox', RootBox, 'layout', [{ name: 'default', label: 'Content' }]);
    reg('ChildBox', ChildBox);
  });

  it('selects a node when clicking its rendered element', async () => {
    const wrapper = mount(EditorCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await wrapper.find('.child-box').trigger('click');

    expect(wrapper.emitted('select')).toEqual([[2]]);
  });

  it('updates hover and clears hover on leave', async () => {
    const wrapper = mount(EditorCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await wrapper.find('.child-box').trigger('mousemove');
    await wrapper.find('.ipb-canvas__content').trigger('mouseleave');

    expect(wrapper.emitted('hover')).toEqual([[2], [null]]);
  });

  it('renders overlays for hovered and selected nodes', async () => {
    const wrapper = mount(EditorCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await wrapper.setProps({
      selectedNodeId: 2,
      hoveredNodeId: 1,
    });
    await nextTick();

    expect(wrapper.find('.ipb-canvas__overlay--selected').exists()).toBe(true);
    expect(wrapper.find('.ipb-canvas__overlay--hovered').exists()).toBe(true);

    await wrapper.setProps({
      selectedNodeId: 2,
      hoveredNodeId: 2,
    });
    await nextTick();

    expect(wrapper.find('.ipb-canvas__overlay--selected').exists()).toBe(true);
    expect(wrapper.find('.ipb-canvas__overlay--hovered').exists()).toBe(false);
  });

  it('prevents the native browser menu inside canvas content', () => {
    const wrapper = mount(EditorCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });

    wrapper.find('.ipb-canvas__content').element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('opens context menu on right-click and emits context actions', async () => {
    const wrapper = mount(EditorCanvas, {
      props: {
        content: contentTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await wrapper.find('.child-box').trigger('contextmenu', { clientX: 120, clientY: 80 });

    expect(wrapper.find('.ipb-node-context-menu').exists()).toBe(true);
    expect(wrapper.emitted('select')).toEqual([[2]]);

    await wrapper.find('[data-action="duplicate"]').trigger('click');

    expect(wrapper.emitted('context-action')).toEqual([
      [{ action: 'duplicate', nodeId: 2 }],
    ]);
  });

  it('disables delete and move actions for readonly nodes', async () => {
    const wrapper = mount(EditorCanvas, {
      props: {
        content: readonlyTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await wrapper.find('.child-box').trigger('contextmenu', { clientX: 64, clientY: 64 });

    expect(wrapper.find('[data-action="delete"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-action="move-up"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-action="move-down"]').attributes('disabled')).toBeDefined();
  });

  it('enables move-up only when a node has a previous sibling', async () => {
    const wrapper = mount(EditorCanvas, {
      props: {
        content: siblingTree,
        variables: {},
        selectedNodeId: null,
        hoveredNodeId: null,
        viewport: 'desktop',
      },
    });

    await wrapper.findAll('.child-box')[1].trigger('contextmenu', { clientX: 48, clientY: 48 });

    expect(wrapper.find('[data-action="move-up"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[data-action="move-down"]').attributes('disabled')).toBeDefined();
  });

  it('drops a new palette component into a valid container target', async () => {
    const dragDrop = useDragDrop();
    const addNode = vi.fn(() => 99);
    const moveNodeTo = vi.fn();

    const wrapper = mount(EditorCanvas, {
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

    dragDrop.startDragNew('ChildBox');
    await wrapper.find('.root-box').trigger('dragover');
    await wrapper.find('.root-box').trigger('drop');

    expect(addNode).toHaveBeenCalledWith(1, 'ChildBox', 1, 'default', undefined);
    expect(moveNodeTo).not.toHaveBeenCalled();
    expect(wrapper.emitted('select')).toContainEqual([99]);
  });

  it('does not emit selection when new-node insertion fails', async () => {
    const dragDrop = useDragDrop();
    const addNode = vi.fn(() => null);
    const moveNodeTo = vi.fn();

    const wrapper = mount(EditorCanvas, {
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

    dragDrop.startDragNew('ChildBox');
    await wrapper.find('.root-box').trigger('dragover');
    await wrapper.find('.root-box').trigger('drop');

    expect(addNode).toHaveBeenCalledWith(1, 'ChildBox', 1, 'default', undefined);
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('falls back to parent drop zone when hovering a non-container node', async () => {
    const dragDrop = useDragDrop();
    const addNode = vi.fn(() => 100);
    const moveNodeTo = vi.fn();

    const wrapper = mount(EditorCanvas, {
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

    dragDrop.startDragNew('ChildBox');
    await wrapper.find('.child-box').trigger('dragover');
    await wrapper.find('.child-box').trigger('drop');

    expect(addNode).toHaveBeenCalledWith(1, 'ChildBox', 1, 'default', undefined);
    expect(moveNodeTo).not.toHaveBeenCalled();
  });

  it('moves an existing node when drop state has sourceNodeId', async () => {
    const dragDrop = useDragDrop();
    const addNode = vi.fn();
    const moveNodeTo = vi.fn();

    const wrapper = mount(EditorCanvas, {
      props: {
        content: siblingTree,
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

    dragDrop.startDragExisting(2);
    await wrapper.find('.root-box').trigger('dragover');
    await wrapper.find('.root-box').trigger('drop');

    expect(moveNodeTo).toHaveBeenCalledWith(2, 1, 1, 'default');
    expect(addNode).not.toHaveBeenCalled();
    expect(wrapper.emitted('select')).toContainEqual([2]);
  });

  it('ignores invalid drops for non-movable source nodes', async () => {
    const dragDrop = useDragDrop();
    const addNode = vi.fn();
    const moveNodeTo = vi.fn();

    const wrapper = mount(EditorCanvas, {
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

    dragDrop.startDragExisting(1);
    await wrapper.find('.root-box').trigger('dragover');
    await wrapper.find('.root-box').trigger('drop');

    expect(moveNodeTo).not.toHaveBeenCalled();
    expect(addNode).not.toHaveBeenCalled();
  });
});
