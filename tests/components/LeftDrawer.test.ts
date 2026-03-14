import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { nextTick } from 'vue';
import LeftDrawer from '@/components/editor/LeftDrawer.vue';
import { clearRegistry, registerComponents } from '@/core/registry';
import type { ComponentCategory, IComponentDefinition } from '@/types/component';

function makeComponent(
  name: string,
  category: ComponentCategory,
  overrides: Partial<Pick<IComponentDefinition, 'label' | 'description'>> = {},
): IComponentDefinition {
  return {
    name,
    label: overrides.label ?? name,
    description: overrides.description ?? `${name} description`,
    category,
    component: defineComponent({ template: `<div class="${name}"><slot /></div>` }),
    slots: [{ name: 'default', label: 'Default' }],
    editableProps: [],
  };
}

describe('LeftDrawer', () => {
  beforeEach(() => {
    clearRegistry();
    registerComponents([
      makeComponent('PbText', 'content'),
      makeComponent('PbSection', 'layout'),
    ]);
  });

  it('emits dragStart with componentName when dragging a tile', async () => {
    const wrapper = mount(LeftDrawer, {
      props: {
        open: true,
      },
    });
    const item = wrapper.find('.ipb-left-drawer__component-item');
    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: 'none',
      setData,
    } as unknown as DataTransfer;

    await item.trigger('dragstart', { dataTransfer });

    expect(wrapper.emitted('dragStart')).toEqual([['PbText']]);
    expect(dataTransfer.effectAllowed).toBe('copy');
    expect(setData).toHaveBeenCalledWith('application/x-ipb-component', 'PbText');
    expect(setData).toHaveBeenCalledWith('text/plain', 'PbText');
  });

  it('emits dragEnd when tile dragging ends', async () => {
    const wrapper = mount(LeftDrawer, {
      props: {
        open: true,
      },
    });
    const item = wrapper.find('.ipb-left-drawer__component-item');

    await item.trigger('dragend');

    expect(wrapper.emitted('dragEnd')).toEqual([[]]);
  });

  it('emits add when clicking a component tile', async () => {
    const wrapper = mount(LeftDrawer, {
      props: {
        open: true,
      },
    });
    const item = wrapper.find('.ipb-left-drawer__component-item');

    await item.trigger('click');

    expect(wrapper.emitted('add')).toEqual([['PbText']]);
  });

  it('shows a search input at the top of the component palette', () => {
    const wrapper = mount(LeftDrawer, {
      props: {
        open: true,
      },
    });

    const input = wrapper.find('.ipb-left-drawer__search-input');
    expect(input.exists()).toBe(true);
    expect(input.attributes('type')).toBe('search');
  });

  it('exposes drawer and tree toggle accessibility attributes', async () => {
    const wrapper = mount(LeftDrawer, {
      props: {
        open: true,
        content: {
          id: 1,
          name: 'PbSection',
          slot: null,
          props: {},
          children: [],
        },
      },
    });

    const drawerToggle = wrapper.get('.ipb-left-drawer__toggle');
    expect(drawerToggle.attributes('aria-expanded')).toBe('true');
    expect(drawerToggle.attributes('aria-controls')).toBe('ipb-left-drawer-content');

    const treeToggle = wrapper.get('.ipb-left-drawer__section-toggle');
    expect(treeToggle.attributes('aria-expanded')).toBe('true');
    expect(treeToggle.attributes('aria-controls')).toBe('ipb-left-drawer-tree-panel');

    await treeToggle.trigger('click');
    expect(treeToggle.attributes('aria-expanded')).toBe('false');
  });

  it('filters components by name, label, description, and category case-insensitively', async () => {
    clearRegistry();
    registerComponents([
      makeComponent('PbHeroBanner', 'layout', {
        label: 'Hero Banner',
        description: 'Top CTA section',
      }),
      makeComponent('PbKpiStats', 'data', {
        label: 'Stats Grid',
        description: 'Displays KPIs and trends',
      }),
      makeComponent('PbText', 'content', {
        label: 'Body Text',
        description: 'Plain paragraph',
      }),
    ]);

    const wrapper = mount(LeftDrawer, {
      props: {
        open: true,
      },
    });

    const input = wrapper.get('.ipb-left-drawer__search-input');
    const getLabels = () =>
      wrapper.findAll('.ipb-left-drawer__component-label').map((item) => item.text());

    await input.setValue('pbkpi');
    expect(getLabels()).toEqual(['Stats Grid']);

    await input.setValue('hero');
    expect(getLabels()).toEqual(['Hero Banner']);

    await input.setValue('TrEnDs');
    expect(getLabels()).toEqual(['Stats Grid']);

    await input.setValue('CONTENT');
    expect(getLabels()).toEqual(['Body Text']);
  });

  it('keeps only categories with matching components visible', async () => {
    clearRegistry();
    registerComponents([
      makeComponent('PbHeroBanner', 'layout', { label: 'Hero Banner' }),
      makeComponent('PbText', 'content', { label: 'Body Text' }),
      makeComponent('PbImage', 'media', { label: 'Gallery Image' }),
    ]);

    const wrapper = mount(LeftDrawer, {
      props: {
        open: true,
      },
    });

    await wrapper.get('.ipb-left-drawer__search-input').setValue('image');

    const categories = wrapper.findAll('.ipb-left-drawer__category-title').map((item) => item.text());
    const labels = wrapper.findAll('.ipb-left-drawer__component-label').map((item) => item.text());

    expect(categories).toEqual(['media']);
    expect(labels).toEqual(['Gallery Image']);
  });

  it('moves focus into drawer content when opening from toggle', async () => {
    const wrapper = mount(LeftDrawer, {
      attachTo: document.body,
      props: {
        open: false,
      },
    });

    const toggle = wrapper.get('.ipb-left-drawer__toggle');
    (toggle.element as HTMLButtonElement).focus();
    await toggle.trigger('click');
    await wrapper.setProps({ open: true });
    await nextTick();

    expect(document.activeElement).toBe(wrapper.get('.ipb-left-drawer__search-input').element);

    wrapper.unmount();
  });

  it('returns focus to toggle when closing while focus is inside drawer', async () => {
    const wrapper = mount(LeftDrawer, {
      attachTo: document.body,
      props: {
        open: true,
      },
    });

    const searchInput = wrapper.get('.ipb-left-drawer__search-input');
    (searchInput.element as HTMLInputElement).focus();

    await wrapper.setProps({ open: false });
    await nextTick();

    expect(document.activeElement).toBe(wrapper.get('.ipb-left-drawer__toggle').element);

    wrapper.unmount();
  });
});
