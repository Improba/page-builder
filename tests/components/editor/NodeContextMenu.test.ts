import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import NodeContextMenu from '@/components/editor/NodeContextMenu.vue';

describe('NodeContextMenu', () => {
  it('autofocuses the first enabled menu item when opened', async () => {
    const wrapper = mount(NodeContextMenu, {
      attachTo: document.body,
      props: {
        open: true,
        canDelete: true,
        canMoveUp: false,
        canMoveDown: true,
      },
    });

    await nextTick();
    await nextTick();

    expect((document.activeElement as HTMLElement | null)?.dataset.action).toBe('duplicate');

    wrapper.unmount();
  });

  it('supports arrow/home/end keyboard navigation and escape close', async () => {
    const wrapper = mount(NodeContextMenu, {
      attachTo: document.body,
      props: {
        open: true,
        canDelete: true,
        canMoveUp: false,
        canMoveDown: true,
      },
    });

    const menu = wrapper.get('.ipb-node-context-menu');
    await nextTick();
    await nextTick();

    await menu.trigger('keydown', { key: 'ArrowDown' });
    expect((document.activeElement as HTMLElement | null)?.dataset.action).toBe('move-down');

    await menu.trigger('keydown', { key: 'End' });
    expect((document.activeElement as HTMLElement | null)?.dataset.action).toBe('delete');

    await menu.trigger('keydown', { key: 'Home' });
    expect((document.activeElement as HTMLElement | null)?.dataset.action).toBe('duplicate');

    await menu.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toEqual([[]]);

    wrapper.unmount();
  });

  it('closes on tab key to return focus flow', async () => {
    const wrapper = mount(NodeContextMenu, {
      attachTo: document.body,
      props: {
        open: true,
        canDelete: true,
        canMoveUp: true,
        canMoveDown: true,
      },
    });

    await nextTick();
    await nextTick();

    await wrapper.get('.ipb-node-context-menu').trigger('keydown', { key: 'Tab' });
    expect(wrapper.emitted('close')).toEqual([[]]);

    wrapper.unmount();
  });

  it('restores focus to the previously focused element when closed', async () => {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.textContent = 'Trigger';
    document.body.appendChild(trigger);
    trigger.focus();

    const wrapper = mount(NodeContextMenu, {
      attachTo: document.body,
      props: {
        open: false,
        canDelete: true,
        canMoveUp: true,
        canMoveDown: true,
      },
    });

    await wrapper.setProps({ open: true });
    await nextTick();
    await nextTick();

    expect((document.activeElement as HTMLElement | null)?.dataset.action).toBe('duplicate');

    await wrapper.setProps({ open: false });
    await nextTick();

    expect(document.activeElement).toBe(trigger);

    wrapper.unmount();
    trigger.remove();
  });

  it('does not emit action when clicking disabled items', async () => {
    const wrapper = mount(NodeContextMenu, {
      props: {
        open: true,
        canDelete: false,
        canMoveUp: false,
        canMoveDown: false,
      },
    });

    await wrapper.get('[data-action="move-up"]').trigger('click');
    await wrapper.get('[data-action="delete"]').trigger('click');

    expect(wrapper.emitted('action')).toBeUndefined();
  });
});
