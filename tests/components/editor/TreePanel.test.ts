import { mount } from '@vue/test-utils';
import TreePanel from '@/components/editor/TreePanel.vue';
import type { INode } from '@/types/node';

const contentTree: INode = {
  id: 1,
  name: 'PbSection',
  slot: null,
  props: {},
  children: [
    {
      id: 2,
      name: 'PbRow',
      slot: 'default',
      props: {},
      children: [
        {
          id: 3,
          name: 'PbText',
          slot: 'default',
          props: {},
          children: [],
        },
      ],
    },
    {
      id: 4,
      name: 'PbButton',
      slot: 'default',
      props: {},
      readonly: true,
      children: [],
    },
  ],
};

describe('TreePanel', () => {
  it('renders hierarchical rows with node name, id, and readonly badge', () => {
    const wrapper = mount(TreePanel, {
      props: {
        content: contentTree,
        selectedNodeId: null,
      },
    });

    const rows = wrapper.findAll('.ipb-tree-panel__item');
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.attributes('data-node-id'))).toEqual(['1', '2', '3', '4']);

    expect(wrapper.get('[data-node-id="1"]').text()).toContain('PbSection');
    expect(wrapper.get('[data-node-id="1"]').text()).toContain('#1');
    expect(wrapper.get('[data-node-id="4"]').text()).toContain('readonly');
    expect(wrapper.get('[data-node-id="3"]').attributes('style')).toContain('padding-inline-start: 40px');
  });

  it('emits select when clicking a row', async () => {
    const wrapper = mount(TreePanel, {
      props: {
        content: contentTree,
        selectedNodeId: null,
      },
    });

    await wrapper.get('[data-node-id="3"]').trigger('click');

    expect(wrapper.emitted('select')).toEqual([[3]]);
  });

  it('marks the selected row', () => {
    const wrapper = mount(TreePanel, {
      props: {
        content: contentTree,
        selectedNodeId: 2,
      },
    });

    expect(wrapper.get('[data-node-id="2"]').classes()).toContain('ipb-tree-panel__item--selected');
    expect(wrapper.get('[data-node-id="1"]').classes()).not.toContain('ipb-tree-panel__item--selected');
  });

  it('applies treeitem semantics and roving tab stop', () => {
    const wrapper = mount(TreePanel, {
      props: {
        content: contentTree,
        selectedNodeId: 2,
      },
    });

    expect(wrapper.get('.ipb-tree-panel__list').attributes('role')).toBe('tree');
    expect(wrapper.get('[data-node-id="2"]').attributes('role')).toBe('treeitem');
    expect(wrapper.get('[data-node-id="2"]').attributes('aria-selected')).toBe('true');
    expect(wrapper.get('[data-node-id="2"]').attributes('tabindex')).toBe('0');
    expect(wrapper.get('[data-node-id="1"]').attributes('tabindex')).toBe('-1');
    expect(wrapper.get('[data-node-id="3"]').attributes('aria-level')).toBe('3');
  });

  it('emits select for readonly rows', async () => {
    const wrapper = mount(TreePanel, {
      props: {
        content: contentTree,
        selectedNodeId: null,
      },
    });

    await wrapper.get('[data-node-id="4"]').trigger('click');

    expect(wrapper.emitted('select')).toEqual([[4]]);
  });

  it('updates the rendered hierarchy when content prop changes', async () => {
    const wrapper = mount(TreePanel, {
      props: {
        content: contentTree,
        selectedNodeId: 3,
      },
    });

    const updatedTree: INode = {
      ...contentTree,
      children: [
        ...contentTree.children,
        {
          id: 5,
          name: 'PbImage',
          slot: 'default',
          props: {},
          children: [],
        },
      ],
    };

    await wrapper.setProps({
      content: updatedTree,
      selectedNodeId: 5,
    });

    const rows = wrapper.findAll('.ipb-tree-panel__item');
    expect(rows.map((row) => row.attributes('data-node-id'))).toEqual(['1', '2', '3', '4', '5']);
    expect(wrapper.get('[data-node-id="5"]').classes()).toContain('ipb-tree-panel__item--selected');
  });

  it('supports keyboard navigation with arrow/home/end keys', async () => {
    const wrapper = mount(TreePanel, {
      props: {
        content: contentTree,
        selectedNodeId: 1,
      },
    });

    const firstRow = wrapper.get('[data-node-id="1"]');
    await firstRow.trigger('keydown', { key: 'ArrowDown' });
    await firstRow.trigger('keydown', { key: 'End' });
    await firstRow.trigger('keydown', { key: 'Home' });
    await firstRow.trigger('keydown', { key: ' ' });

    expect(wrapper.emitted('select')).toEqual([[2], [4], [1], [1]]);
  });
});
