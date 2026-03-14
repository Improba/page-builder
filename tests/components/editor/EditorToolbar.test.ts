import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import EditorToolbar from '@/components/editor/EditorToolbar.vue';

function getViewportButton(wrapper: VueWrapper, label: string) {
  const button = wrapper.findAll('.ipb-toolbar__btn').find((item) => item.text() === label);
  if (!button) {
    throw new Error(`Expected viewport button "${label}" to exist.`);
  }
  return button;
}

describe('EditorToolbar', () => {
  it('emits viewport-change when selecting preset buttons', async () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        viewport: 'desktop',
      },
    });

    await getViewportButton(wrapper, 'Tablet').trigger('click');
    await getViewportButton(wrapper, 'Mobile').trigger('click');

    expect(wrapper.emitted('viewport-change')).toEqual([['tablet'], ['mobile']]);
  });

  it('renders active viewport size label when dimensions are provided', () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        viewport: 'tablet',
        activeViewportWidth: 768,
        activeViewportHeight: 1024,
      },
    });

    expect(wrapper.find('.ipb-toolbar__viewport-size').text()).toBe('768×1024');
  });

  it('emits clamped custom viewport width/height from input controls', async () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        viewport: 'custom',
        customViewportWidth: 1024,
        customViewportHeight: 768,
      },
    });

    const sizeInputs = wrapper.findAll('.ipb-toolbar__size-input');
    expect(sizeInputs).toHaveLength(2);

    await sizeInputs[0].setValue('120');
    await sizeInputs[0].setValue('5000');
    await sizeInputs[1].setValue('200');
    await sizeInputs[1].setValue('8000');

    expect(wrapper.emitted('custom-viewport-change')).toEqual([
      [{ width: 240, height: 768 }],
      [{ width: 3840, height: 768 }],
      [{ width: 1024, height: 320 }],
      [{ width: 1024, height: 4320 }],
    ]);
  });

  it('ignores blank custom viewport inputs', async () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        viewport: 'custom',
        customViewportWidth: 1024,
        customViewportHeight: 768,
      },
    });

    const sizeInputs = wrapper.findAll('.ipb-toolbar__size-input');
    expect(sizeInputs).toHaveLength(2);

    await sizeInputs[0].setValue('');
    await sizeInputs[1].setValue('');

    expect(wrapper.emitted('custom-viewport-change')).toBeUndefined();
  });

  it('adds accessible labels and pressed state for toolbar controls', () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        viewport: 'tablet',
      },
    });

    expect(wrapper.get('.ipb-toolbar').attributes('role')).toBe('toolbar');
    expect(wrapper.find('button[aria-label="Undo"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Redo"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Save page"]').exists()).toBe(true);

    expect(getViewportButton(wrapper, 'Tablet').attributes('aria-pressed')).toBe('true');
    expect(getViewportButton(wrapper, 'Desktop').attributes('aria-pressed')).toBe('false');
  });

  it('supports keyboard navigation between viewport controls', async () => {
    const wrapper = mount(EditorToolbar, {
      props: {
        viewport: 'desktop',
      },
      attachTo: document.body,
    });

    const desktopButton = getViewportButton(wrapper, 'Desktop');
    await desktopButton.trigger('keydown', { key: 'ArrowRight' });
    await nextTick();

    const tabletButton = getViewportButton(wrapper, 'Tablet');
    await tabletButton.trigger('keydown', { key: 'End' });
    await nextTick();

    const customButton = getViewportButton(wrapper, 'Custom');
    await customButton.trigger('keydown', { key: 'Home' });
    await nextTick();

    expect(wrapper.emitted('viewport-change')).toEqual([['tablet'], ['custom'], ['desktop']]);
    expect(document.activeElement).toBe(getViewportButton(wrapper, 'Desktop').element);

    wrapper.unmount();
  });
});
