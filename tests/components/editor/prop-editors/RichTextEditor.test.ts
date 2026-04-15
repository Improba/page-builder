import { mount } from '@vue/test-utils';
import RichTextEditor from '@/components/editor/prop-editors/RichTextEditor.vue';

function mockExecCommand(
  implementation: (command: string, showUI: boolean, value?: string) => boolean = () => true
) {
  const execCommand = vi.fn(implementation);
  Object.defineProperty(document, 'execCommand', {
    value: execCommand,
    configurable: true,
    writable: true,
  });
  return execCommand;
}

describe('RichTextEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial HTML from modelValue', () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Hello <strong>world</strong></p>',
      },
    });

    const content = wrapper.find('.ipb-richtext-editor__content').element as HTMLDivElement;
    expect(content.innerHTML).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('sanitizes unsafe initial HTML from modelValue', () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p onclick="alert(1)">Safe</p><script>alert(1)</script>',
      },
    });

    const content = wrapper.find('.ipb-richtext-editor__content').element as HTMLDivElement;
    expect(content.innerHTML).toBe('<p>Safe</p>');
  });

  it('emits update:modelValue HTML string on content input', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Start</p>',
      },
    });

    const content = wrapper.find('.ipb-richtext-editor__content');
    (content.element as HTMLDivElement).innerHTML = '<p>Updated</p>';
    await content.trigger('input');

    expect(wrapper.emitted('update:modelValue')).toEqual([['<p>Updated</p>']]);
  });

  it('emits sanitized HTML on input', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Start</p>',
      },
    });

    const content = wrapper.find('.ipb-richtext-editor__content');
    (content.element as HTMLDivElement).innerHTML = '<p onclick="evil()">Updated</p><script>alert(1)</script>';
    await content.trigger('input');

    expect(wrapper.emitted('update:modelValue')).toEqual([['<p>Updated</p>']]);
    expect((content.element as HTMLDivElement).innerHTML).toBe('<p>Updated</p>');
  });

  it('runs formatting command from toolbar and emits resulting HTML', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Text</p>',
      },
      attachTo: document.body,
    });

    const execSpy = mockExecCommand((command: string) => {
      if (command === 'bold') {
        (wrapper.find('.ipb-richtext-editor__content').element as HTMLDivElement).innerHTML =
          '<p><b>Text</b></p>';
      }
      return true;
    });

    await wrapper.find('button[aria-label="Bold"]').trigger('click');

    expect(execSpy).toHaveBeenCalledWith('bold', false, undefined);
    expect(wrapper.emitted('update:modelValue')).toEqual([['<p><b>Text</b></p>']]);
  });

  it('prompts for URL and creates link', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Visit</p>',
      },
      attachTo: document.body,
    });

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.test');
    const execSpy = mockExecCommand((command: string) => {
      if (command === 'createLink') {
        (wrapper.find('.ipb-richtext-editor__content').element as HTMLDivElement).innerHTML =
          '<p><a href="https://example.test">Visit</a></p>';
      }
      return true;
    });

    await wrapper.find('button[aria-label="Link"]').trigger('click');

    expect(promptSpy).toHaveBeenCalledWith('Enter URL', 'https://');
    expect(execSpy).toHaveBeenCalledWith('createLink', false, 'https://example.test');
    expect(wrapper.emitted('update:modelValue')).toEqual([
      ['<p><a href="https://example.test">Visit</a></p>'],
    ]);
  });

  it('syncs editor content when modelValue prop changes', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Before</p>',
      },
    });

    await wrapper.setProps({ modelValue: '<p>After</p>' });

    const content = wrapper.find('.ipb-richtext-editor__content').element as HTMLDivElement;
    expect(content.innerHTML).toBe('<p>After</p>');
  });

  it('does not emit duplicate HTML updates across input and blur', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Initial</p>',
      },
    });

    const content = wrapper.find('.ipb-richtext-editor__content');
    (content.element as HTMLDivElement).innerHTML = '<p>Changed once</p>';
    await content.trigger('input');
    await content.trigger('blur');

    expect(wrapper.emitted('update:modelValue')).toEqual([['<p>Changed once</p>']]);
  });

  it('does not create link when URL prompt is cancelled', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Visit</p>',
      },
      attachTo: document.body,
    });

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const execSpy = mockExecCommand();

    await wrapper.find('button[aria-label="Link"]').trigger('click');

    expect(promptSpy).toHaveBeenCalledWith('Enter URL', 'https://');
    expect(execSpy).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('does not create link when URL prompt value is unsafe', async () => {
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p>Visit</p>',
      },
      attachTo: document.body,
    });

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('javascript:alert(1)');
    const execSpy = mockExecCommand();

    await wrapper.find('button[aria-label="Link"]').trigger('click');

    expect(promptSpy).toHaveBeenCalledWith('Enter URL', 'https://');
    expect(execSpy).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
