import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import PageBuilder from '@/components/PageBuilder.vue';
import { registerComponents, clearRegistry } from '@/core/registry';
import type { IPageData } from '@/types/node';
import type { IComponentDefinition } from '@/types/component';

const StubReader = defineComponent({
  name: 'PageReader',
  props: ['pageData'],
  template: '<div class="stub-reader">reader</div>',
});

const StubEditor = defineComponent({
  name: 'PageEditor',
  props: ['pageData'],
  emits: ['save', 'change'],
  template: '<div class="stub-editor">editor</div>',
});

const minimalPageData: IPageData = {
  meta: {
    id: 'page-1',
    name: 'Test Page',
    url: '/test',
    status: 'draft',
  },
  content: {
    id: 1,
    name: 'PbSection',
    slot: null,
    props: {},
    children: [],
  },
  layout: {
    id: 100,
    name: 'PbContainer',
    slot: null,
    props: {},
    children: [],
  },
  maxId: 100,
  variables: {},
};

function stubComponent(name: string): IComponentDefinition {
  return {
    name,
    label: name,
    category: 'layout',
    component: defineComponent({ template: `<div class="${name}"><slot /></div>` }),
    slots: [{ name: 'default', label: 'Default' }],
    editableProps: [],
  };
}

describe('PageBuilder', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearRegistry();
    registerComponents([
      stubComponent('PbSection'),
      stubComponent('PbContainer'),
    ]);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders PageReader when mode is "read"', () => {
    const wrapper = mount(PageBuilder, {
      props: {
        pageData: minimalPageData,
        mode: 'read',
      },
      global: {
        stubs: {
          PageReader: StubReader,
          PageEditor: StubEditor,
        },
      },
    });

    expect(wrapper.find('.stub-reader').exists()).toBe(true);
    expect(wrapper.find('.stub-editor').exists()).toBe(false);
  });

  it('renders PageEditor when mode is "edit"', () => {
    const wrapper = mount(PageBuilder, {
      props: {
        pageData: minimalPageData,
        mode: 'edit',
      },
      global: {
        stubs: {
          PageReader: StubReader,
          PageEditor: StubEditor,
        },
      },
    });

    expect(wrapper.find('.stub-editor').exists()).toBe(true);
    expect(wrapper.find('.stub-reader').exists()).toBe(false);
  });

  it('defaults to read mode when mode prop is not provided', () => {
    const wrapper = mount(PageBuilder, {
      props: {
        pageData: minimalPageData,
      },
      global: {
        stubs: {
          PageReader: StubReader,
          PageEditor: StubEditor,
        },
      },
    });

    expect(wrapper.find('.stub-reader').exists()).toBe(true);
    expect(wrapper.find('.stub-editor').exists()).toBe(false);
  });

  it('falls back to read mode when edit payload is structurally invalid', () => {
    const invalidPageData = {
      ...minimalPageData,
      content: {
        id: 1,
        name: 'PbSection',
        slot: null,
        props: {},
        children: null,
      },
    } as unknown as IPageData;

    const wrapper = mount(PageBuilder, {
      props: {
        pageData: invalidPageData,
        mode: 'edit',
      },
      global: {
        stubs: {
          PageReader: StubReader,
          PageEditor: StubEditor,
        },
      },
    });

    expect(wrapper.find('.stub-reader').exists()).toBe(true);
    expect(wrapper.find('.stub-editor').exists()).toBe(false);
    expect(wrapper.text()).toContain('Invalid `pageData` for edit mode. Rendering in read mode.');
    const diagnostics = consoleErrorSpy.mock.calls.map((call) => String(call[0] ?? ''));
    expect(
      diagnostics.some((message) =>
        message.includes('Invalid pageData payload detected. Rendering continues with degraded behavior.'),
      ),
    ).toBe(true);
  });

  it('falls back to read mode when an unknown mode is provided', () => {
    const wrapper = mount(PageBuilder, {
      props: {
        pageData: minimalPageData,
        mode: 'preview' as unknown as 'read' | 'edit',
      },
      global: {
        stubs: {
          PageReader: StubReader,
          PageEditor: StubEditor,
        },
      },
    });

    expect(wrapper.find('.stub-reader').exists()).toBe(true);
    expect(wrapper.find('.stub-editor').exists()).toBe(false);
    const diagnostics = consoleErrorSpy.mock.calls.map((call) => String(call[0] ?? ''));
    expect(
      diagnostics.some((message) => message.includes('Unknown mode "preview". Falling back to "read".')),
    ).toBe(true);
  });
});
