import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { nextTick } from 'vue';
import RightDrawer from '@/components/editor/RightDrawer.vue';
import { registerComponent, clearRegistry } from '@/core/registry';
import type { IComponentDefinition } from '@/types/component';
import type { INode } from '@/types/node';

const TestRenderable = defineComponent({
  name: 'TestRenderable',
  template: '<div><slot /></div>',
});

const testDefinition: IComponentDefinition = {
  name: 'TestEditable',
  label: 'Test Editable',
  category: 'content',
  component: TestRenderable,
  slots: [],
  editableProps: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Hello' },
    { key: 'body', label: 'Body', type: 'richtext', defaultValue: '<p>Hello body</p>' },
    {
      key: 'columns',
      label: 'Columns',
      type: 'number',
      defaultValue: 2,
      validation: { min: 1, max: 6 },
    },
    { key: 'enabled', label: 'Enabled', type: 'boolean', defaultValue: true },
    {
      key: 'theme',
      label: 'Theme',
      type: 'select',
      defaultValue: 'light',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    { key: 'color', label: 'Color', type: 'color', defaultValue: '#00ff00' },
    { key: 'heroImage', label: 'Hero image', type: 'image', defaultValue: '' },
    { key: 'ctaUrl', label: 'CTA URL', type: 'url', defaultValue: '' },
  ],
};

function createContentNode(readonly = false): INode {
  return {
    id: 10,
    name: 'TestEditable',
    slot: null,
    readonly,
    props: {
      title: 'Original title',
      body: '<p>Original body</p>',
      columns: 3,
      enabled: true,
      theme: 'light',
      color: '#00ff00',
      heroImage: 'https://images.example.test/hero.jpg',
      ctaUrl: 'https://example.test',
    },
    children: [],
  };
}

function mountDrawer(content = createContentNode()) {
  return mount(RightDrawer, {
    props: {
      open: true,
      selectedNodeId: 10,
      content,
    },
  });
}

describe('RightDrawer', () => {
  beforeEach(() => {
    clearRegistry();
    registerComponent(testDefinition);
  });

  afterEach(() => {
    clearRegistry();
  });

  it('renders type-specific editors from editableProps schema', () => {
    const wrapper = mountDrawer();

    expect(wrapper.find('[data-prop-key="title"] input[type="text"]').exists()).toBe(true);
    expect(
      wrapper.find('[data-prop-key="body"] .ipb-richtext-editor__content[contenteditable="true"]').exists()
    ).toBe(true);
    expect(wrapper.find('[data-prop-key="columns"] input[type="number"]').exists()).toBe(true);
    expect(wrapper.find('[data-prop-key="enabled"] input[type="checkbox"]').exists()).toBe(true);
    expect(wrapper.find('[data-prop-key="theme"] select').exists()).toBe(true);
    expect(wrapper.find('[data-prop-key="color"] input[type="color"]').exists()).toBe(true);
    expect(wrapper.find('[data-prop-key="heroImage"] input[type="url"]').exists()).toBe(true);
    expect(wrapper.find('[data-prop-key="ctaUrl"] input[type="url"]').exists()).toBe(true);
  });

  it('emits typed structured update-props payloads', async () => {
    const wrapper = mountDrawer();

    await wrapper.find('[data-prop-key="title"] input[type="text"]').setValue('Updated title');
    const bodyEditor = wrapper.find('[data-prop-key="body"] .ipb-richtext-editor__content');
    (bodyEditor.element as HTMLDivElement).innerHTML = '<p>Updated body</p>';
    await bodyEditor.trigger('input');
    await wrapper.find('[data-prop-key="columns"] input[type="number"]').setValue('5');
    await wrapper.find('[data-prop-key="enabled"] input[type="checkbox"]').setValue(false);
    await wrapper.find('[data-prop-key="theme"] select').setValue('1');
    await wrapper.find('[data-prop-key="color"] input[type="color"]').setValue('#112233');
    await wrapper.find('[data-prop-key="heroImage"] input[type="url"]').setValue('https://cdn.example.test/new-hero.jpg');
    await wrapper.find('[data-prop-key="ctaUrl"] input[type="url"]').setValue('https://example.test/updated');

    expect(wrapper.emitted('update-props')).toEqual([
      [10, { title: 'Updated title' }],
      [10, { body: '<p>Updated body</p>' }],
      [10, { columns: 5 }],
      [10, { enabled: false }],
      [10, { theme: 'dark' }],
      [10, { color: '#112233' }],
      [10, { heroImage: 'https://cdn.example.test/new-hero.jpg' }],
      [10, { ctaUrl: 'https://example.test/updated' }],
    ]);
  });

  it('keeps duplicate and delete actions wired', async () => {
    const wrapper = mountDrawer();

    await wrapper.find('.ipb-right-drawer__btn').trigger('click');
    await wrapper.find('.ipb-right-drawer__btn--danger').trigger('click');

    expect(wrapper.emitted('duplicate')).toEqual([[10]]);
    expect(wrapper.emitted('delete')).toEqual([[10]]);
  });

  it('disables delete action for readonly nodes', () => {
    const wrapper = mountDrawer(createContentNode(true));

    expect(wrapper.find('.ipb-right-drawer__btn--danger').attributes('disabled')).toBeDefined();
  });

  it('links drawer controls and property labels for accessibility', () => {
    const wrapper = mountDrawer();

    const toggle = wrapper.get('.ipb-right-drawer__toggle');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(toggle.attributes('aria-controls')).toBe('ipb-right-drawer-content');

    const titleEditor = wrapper.get('[data-prop-key="title"] input[type="text"]');
    expect(titleEditor.attributes('aria-labelledby')).toBe('ipb-right-drawer-prop-label-title');
    expect(wrapper.get('#ipb-right-drawer-prop-label-title').text()).toBe('Title');

    const richTextEditor = wrapper.get('[data-prop-key="body"] .ipb-richtext-editor__content');
    expect(richTextEditor.attributes('aria-labelledby')).toBe('ipb-right-drawer-prop-label-body');

    const mediaInput = wrapper.get('[data-prop-key="heroImage"] input[type="url"]');
    expect(mediaInput.attributes('aria-labelledby')).toBe('ipb-right-drawer-prop-label-heroImage');
  });

  it('moves focus into properties when opening from toggle', async () => {
    const wrapper = mount(RightDrawer, {
      attachTo: document.body,
      props: {
        open: false,
        selectedNodeId: 10,
        content: createContentNode(),
      },
    });

    const toggle = wrapper.get('.ipb-right-drawer__toggle');
    (toggle.element as HTMLButtonElement).focus();
    await toggle.trigger('click');
    await wrapper.setProps({ open: true });
    await nextTick();

    expect(document.activeElement).toBe(wrapper.get('[data-prop-key="title"] input[type="text"]').element);

    wrapper.unmount();
  });

  it('returns focus to toggle when closing while focus is inside drawer', async () => {
    const wrapper = mount(RightDrawer, {
      attachTo: document.body,
      props: {
        open: true,
        selectedNodeId: 10,
        content: createContentNode(),
      },
    });
    const titleEditor = wrapper.get('[data-prop-key="title"] input[type="text"]');
    (titleEditor.element as HTMLInputElement).focus();

    await wrapper.setProps({ open: false });
    await nextTick();

    expect(document.activeElement).toBe(wrapper.get('.ipb-right-drawer__toggle').element);

    wrapper.unmount();
  });
});
