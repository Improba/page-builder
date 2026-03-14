import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import NodeRenderer from '@/components/reader/NodeRenderer.vue';
import { registerComponent, clearRegistry } from '@/core/registry';
import type { INode } from '@/types/node';
import type { IComponentDefinition } from '@/types/component';

const TestBox = defineComponent({
  name: 'TestBox',
  props: {
    title: { type: String, default: '' },
    color: { type: String, default: 'black' },
  },
  template: '<div class="test-box" :data-title="title" :data-color="color"><slot /></div>',
});

const TestWrapper = defineComponent({
  name: 'TestWrapper',
  template: `
    <div class="test-wrapper">
      <div class="slot-default"><slot /></div>
      <div class="slot-sidebar"><slot name="sidebar" /></div>
    </div>
  `,
});

const ThrowOnRender = defineComponent({
  name: 'ThrowOnRender',
  setup() {
    return () => {
      throw new Error('Render explosion');
    };
  },
});

function reg(name: string, component: any, category: 'content' | 'layout' = 'content'): void {
  registerComponent({
    name,
    label: name,
    category,
    component,
    slots: [],
    editableProps: [],
  } as IComponentDefinition);
}

describe('NodeRenderer', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearRegistry();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('basic rendering', () => {
    it('renders a registered component', () => {
      reg('TestBox', TestBox);

      const node: INode = {
        id: 1,
        name: 'TestBox',
        slot: null,
        props: {},
        children: [],
      };

      const wrapper = mount(NodeRenderer, {
        props: { node, variables: {} },
      });

      expect(wrapper.find('.test-box').exists()).toBe(true);
    });

    it('passes props correctly', () => {
      reg('TestBox', TestBox);

      const node: INode = {
        id: 1,
        name: 'TestBox',
        slot: null,
        props: { title: 'Hello', color: 'red' },
        children: [],
      };

      const wrapper = mount(NodeRenderer, {
        props: { node, variables: {} },
      });

      const box = wrapper.find('.test-box');
      expect(box.attributes('data-title')).toBe('Hello');
      expect(box.attributes('data-color')).toBe('red');
    });

    it('interpolates variables in props', () => {
      reg('TestBox', TestBox);

      const node: INode = {
        id: 1,
        name: 'TestBox',
        slot: null,
        props: { title: 'Hi {{ USER }}' },
        children: [],
      };

      const wrapper = mount(NodeRenderer, {
        props: { node, variables: { USER: 'Alice' } },
      });

      expect(wrapper.find('.test-box').attributes('data-title')).toBe('Hi Alice');
    });

    it('adds node marker attributes only when requested', () => {
      reg('TestBox', TestBox);

      const node: INode = {
        id: 7,
        name: 'TestBox',
        slot: null,
        props: {},
        children: [],
      };

      const defaultWrapper = mount(NodeRenderer, {
        props: { node, variables: {} },
      });
      expect(defaultWrapper.find('[data-ipb-node-id]').exists()).toBe(false);

      const markedWrapper = mount(NodeRenderer, {
        props: { node, variables: {}, markNodes: true },
      });
      expect(markedWrapper.find('[data-ipb-node-id="7"]').exists()).toBe(true);
    });
  });

  describe('children and slots', () => {
    it('renders children recursively in the default slot', () => {
      reg('TestWrapper', TestWrapper);
      reg('TestBox', TestBox);

      const node: INode = {
        id: 1,
        name: 'TestWrapper',
        slot: null,
        props: {},
        children: [
          { id: 2, name: 'TestBox', slot: 'default', props: { title: 'Child1' }, children: [] },
          { id: 3, name: 'TestBox', slot: 'default', props: { title: 'Child2' }, children: [] },
        ],
      };

      const wrapper = mount(NodeRenderer, {
        props: { node, variables: {} },
      });

      const defaultSlot = wrapper.find('.slot-default');
      const boxes = defaultSlot.findAll('.test-box');
      expect(boxes).toHaveLength(2);
      expect(boxes[0].attributes('data-title')).toBe('Child1');
      expect(boxes[1].attributes('data-title')).toBe('Child2');
    });

    it('distributes children across named slots', () => {
      reg('TestWrapper', TestWrapper);
      reg('TestBox', TestBox);

      const node: INode = {
        id: 1,
        name: 'TestWrapper',
        slot: null,
        props: {},
        children: [
          { id: 2, name: 'TestBox', slot: 'default', props: { title: 'Main' }, children: [] },
          { id: 3, name: 'TestBox', slot: 'sidebar', props: { title: 'Side' }, children: [] },
        ],
      };

      const wrapper = mount(NodeRenderer, {
        props: { node, variables: {} },
      });

      expect(wrapper.find('.slot-default .test-box').attributes('data-title')).toBe('Main');
      expect(wrapper.find('.slot-sidebar .test-box').attributes('data-title')).toBe('Side');
    });
  });

  describe('error handling', () => {
    it('shows a fallback for an unregistered component instead of throwing', async () => {
      const node: INode = {
        id: 1,
        name: 'NonExistent',
        slot: null,
        props: {},
        children: [],
      };

      const wrapper = mount(NodeRenderer, {
        props: { node, variables: {} },
      });
      await nextTick();

      expect(wrapper.find('.ipb-error-boundary').exists()).toBe(true);
      expect(wrapper.text()).toContain('This block could not be rendered.');
    });

    it('isolates child subtree failures so sibling nodes still render', async () => {
      reg('TestWrapper', TestWrapper);
      reg('TestBox', TestBox);
      reg('ThrowOnRender', ThrowOnRender);

      const node: INode = {
        id: 1,
        name: 'TestWrapper',
        slot: null,
        props: {},
        children: [
          { id: 2, name: 'TestBox', slot: 'default', props: { title: 'Safe child' }, children: [] },
          { id: 3, name: 'ThrowOnRender', slot: 'default', props: {}, children: [] },
        ],
      };

      const wrapper = mount(NodeRenderer, {
        props: { node, variables: {} },
      });
      await nextTick();

      const defaultSlot = wrapper.find('.slot-default');
      expect(defaultSlot.find('.test-box').exists()).toBe(true);
      expect(defaultSlot.find('.test-box').attributes('data-title')).toBe('Safe child');
      expect(defaultSlot.find('.ipb-error-boundary').exists()).toBe(true);
    });

    it('renders an inline invalid-node fallback when payload shape is invalid', () => {
      const wrapper = mount(NodeRenderer, {
        props: {
          node: {
            id: 1,
            name: '',
            slot: null,
            props: {},
            children: [],
          } as unknown as INode,
          variables: {},
        },
      });

      expect(wrapper.find('.ipb-node-renderer__invalid').exists()).toBe(true);
      expect(wrapper.text()).toContain('This block is invalid and could not be rendered.');
    });

    it('ignores malformed child nodes and keeps valid siblings rendered', async () => {
      reg('TestWrapper', TestWrapper);
      reg('TestBox', TestBox);

      const node = {
        id: 1,
        name: 'TestWrapper',
        slot: null,
        props: {},
        children: [
          { id: 2, name: 'TestBox', slot: 'default', props: { title: 'Safe child' }, children: [] },
          { id: 999, name: '', slot: 'default', props: {}, children: [] },
        ],
      } as unknown as INode;

      const wrapper = mount(NodeRenderer, {
        props: { node, variables: {} },
      });
      await nextTick();

      const defaultSlot = wrapper.find('.slot-default');
      expect(defaultSlot.findAll('.test-box')).toHaveLength(1);
      expect(defaultSlot.find('.test-box').attributes('data-title')).toBe('Safe child');
    });
  });
});
