import { mount } from '@vue/test-utils';
import PbImage from '@/built-in/PbImage.vue';
import PbSection from '@/built-in/PbSection.vue';
import PbText from '@/built-in/PbText.vue';

describe('Built-in component security hardening', () => {
  it('sanitizes PbText HTML and enforces safe tag fallback', () => {
    const wrapper = mount(PbText, {
      props: {
        tag: 'script',
        content: '<p onclick="alert(1)">Hello</p><script>alert(1)</script>',
      },
    });

    expect(wrapper.element.tagName).toBe('DIV');
    expect(wrapper.html()).toContain('<p>Hello</p>');
    expect(wrapper.html()).not.toContain('onclick=');
    expect(wrapper.html()).not.toContain('<script');
  });

  it('blocks unsafe PbImage src values', () => {
    const wrapper = mount(PbImage, {
      props: {
        src: 'javascript:alert(1)',
        alt: 'Unsafe image',
      },
    });

    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('renders PbImage for safe src values', () => {
    const wrapper = mount(PbImage, {
      props: {
        src: 'https://cdn.example.test/photo.jpg',
        alt: 'Safe image',
      },
    });

    const image = wrapper.find('img');
    expect(image.exists()).toBe(true);
    expect(image.attributes('src')).toBe('https://cdn.example.test/photo.jpg');
  });

  it('drops unsafe PbSection background images', () => {
    const wrapper = mount(PbSection, {
      props: {
        backgroundImage: 'javascript:alert(1)',
      },
    });

    const section = wrapper.find('section');
    expect(section.attributes('style') ?? '').not.toContain('background-image');
  });

  it('keeps safe PbSection background images', () => {
    const wrapper = mount(PbSection, {
      props: {
        backgroundImage: 'https://cdn.example.test/bg.jpg',
      },
    });

    const section = wrapper.find('section');
    expect(section.attributes('style') ?? '').toContain('background-image');
    expect(section.attributes('style') ?? '').toContain('https://cdn.example.test/bg.jpg');
  });
});
