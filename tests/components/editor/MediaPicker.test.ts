import { mount } from '@vue/test-utils';
import MediaPicker from '@/components/editor/prop-editors/MediaPicker.vue';

describe('MediaPicker', () => {
  it('renders URL input with placeholder and empty preview state', () => {
    const wrapper = mount(MediaPicker, {
      props: { modelValue: '' },
    });

    const input = wrapper.find('input[type="url"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes('placeholder')).toContain('https://');

    expect(wrapper.find('.ipb-media-picker__image').exists()).toBe(false);
    expect(wrapper.find('.ipb-media-picker__empty').text()).toContain('Paste an image URL');
    expect(wrapper.find('.ipb-media-picker__btn').attributes('disabled')).toBeDefined();
  });

  it('emits update:modelValue from the URL input', async () => {
    const wrapper = mount(MediaPicker, {
      props: { modelValue: '' },
    });

    await wrapper.find('input[type="url"]').setValue('https://cdn.example.com/hero.jpg');

    expect(wrapper.emitted('update:modelValue')).toEqual([['https://cdn.example.com/hero.jpg']]);
  });

  it('sanitizes unsafe URL input before emitting', async () => {
    const wrapper = mount(MediaPicker, {
      props: { modelValue: '' },
    });

    await wrapper.find('input[type="url"]').setValue('javascript:alert(1)');

    expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
  });

  it('renders preview for valid media URL and clears value', async () => {
    const wrapper = mount(MediaPicker, {
      props: { modelValue: 'https://images.example.com/photo.png' },
    });

    const image = wrapper.find('.ipb-media-picker__image');
    expect(image.exists()).toBe(true);
    expect(image.attributes('src')).toBe('https://images.example.com/photo.png');

    const clearButton = wrapper.findAll('.ipb-media-picker__btn')[0];
    expect(clearButton.attributes('disabled')).toBeUndefined();

    await clearButton.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toContainEqual(['']);
  });

  it('emits upload event for placeholder upload callback', async () => {
    const wrapper = mount(MediaPicker, {
      props: { modelValue: '' },
    });

    const uploadButton = wrapper.findAll('.ipb-media-picker__btn')[1];
    await uploadButton.trigger('click');

    expect(wrapper.emitted('upload')).toEqual([[]]);
  });

  it('trims modelValue and previews data URI images', () => {
    const wrapper = mount(MediaPicker, {
      props: { modelValue: '  data:image/png;base64,abc123  ' },
    });

    const image = wrapper.find('.ipb-media-picker__image');
    expect(image.exists()).toBe(true);
    expect(image.attributes('src')).toBe('data:image/png;base64,abc123');
  });

  it('shows empty preview for unsupported URL protocols but still allows clearing', async () => {
    const wrapper = mount(MediaPicker, {
      props: { modelValue: 'ftp://cdn.example.com/image.jpg' },
    });

    expect(wrapper.find('.ipb-media-picker__image').exists()).toBe(false);
    expect(wrapper.find('.ipb-media-picker__empty').exists()).toBe(true);

    const clearButton = wrapper.findAll('.ipb-media-picker__btn')[0];
    expect(clearButton.attributes('disabled')).toBeUndefined();

    await clearButton.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
  });

  it('does not preview unsafe data URI media payloads', () => {
    const wrapper = mount(MediaPicker, {
      props: { modelValue: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' },
    });

    expect(wrapper.find('.ipb-media-picker__image').exists()).toBe(false);
    expect(wrapper.find('.ipb-media-picker__empty').exists()).toBe(true);
  });
});
