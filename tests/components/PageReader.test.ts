import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import PageReader from '@/components/reader/PageReader.vue';
import { registerComponent, clearRegistry } from '@/core/registry';
import type { IPageData, INode } from '@/types/node';
import type { IComponentDefinition } from '@/types/component';

const ContentBlock = defineComponent({
  name: 'ContentBlock',
  props: {
    text: { type: String, default: '' },
  },
  template: '<article class="content-block">{{ text }}</article>',
});

const LayoutShell = defineComponent({
  name: 'LayoutShell',
  template: '<div class="layout-shell"><slot /></div>',
});

const LayoutWithNamedContentSlot = defineComponent({
  name: 'LayoutWithNamedContentSlot',
  template: `
    <div class="layout-shell">
      <div class="slot-default"><slot /></div>
      <div class="slot-content"><slot name="content" /></div>
    </div>
  `,
});

function reg(name: string, component: object, category: 'content' | 'layout' = 'content'): void {
  registerComponent({
    name,
    label: name,
    category,
    component,
    slots: [],
    editableProps: [],
  } as IComponentDefinition);
}

function makePageData(layoutName = 'LayoutShell', contentSlot: string | null = null): IPageData {
  const content: INode = {
    id: 1,
    name: 'ContentBlock',
    slot: contentSlot,
    props: { text: 'Hello world' },
    children: [],
  };

  return {
    meta: {
      id: 'page-1',
      name: 'Reader Test',
      url: '/reader-test',
      status: 'draft',
    },
    content,
    layout: {
      id: 100,
      name: layoutName,
      slot: null,
      props: {},
      children: [],
    },
    maxId: 100,
    variables: {},
  };
}

function fallbackTestPageData(contentComponentName: string): IPageData {
  return {
    meta: {
      id: 'page-1',
      name: 'Test page',
      url: '/test',
      status: 'draft',
    },
    content: {
      id: 1,
      name: contentComponentName,
      slot: null,
      props: {},
      children: [],
    },
    layout: {
      id: 100,
      name: 'LayoutShell',
      slot: null,
      props: {},
      children: [],
    },
    maxId: 100,
    variables: {},
  };
}

describe('PageReader', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearRegistry();
    reg('ContentBlock', ContentBlock);
    reg('LayoutShell', LayoutShell, 'layout');
    reg('LayoutWithNamedContentSlot', LayoutWithNamedContentSlot, 'layout');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders content inside layout in read mode', () => {
    const pageData = makePageData();

    const wrapper = mount(PageReader, {
      props: { pageData },
    });

    expect(wrapper.find('.ipb-page-reader > .layout-shell').exists()).toBe(true);
    expect(wrapper.find('.layout-shell .content-block').exists()).toBe(true);
    expect(pageData.content.slot).toBeNull();
  });

  it('uses the content root slot when provided', () => {
    const pageData = makePageData('LayoutWithNamedContentSlot', 'content');

    const wrapper = mount(PageReader, {
      props: { pageData },
    });

    expect(wrapper.find('.slot-content .content-block').exists()).toBe(true);
    expect(wrapper.find('.slot-default .content-block').exists()).toBe(false);
  });

  it('falls back to content-only rendering when layout is missing', () => {
    const pageData = makePageData();
    const legacyPageData = { ...pageData, layout: undefined } as unknown as IPageData;

    const wrapper = mount(PageReader, {
      props: { pageData: legacyPageData },
    });

    expect(wrapper.find('.content-block').exists()).toBe(true);
    expect(wrapper.find('.layout-shell').exists()).toBe(false);
  });

  it('renders the node tree when all components are registered', async () => {
    const wrapper = mount(PageReader, {
      props: {
        pageData: fallbackTestPageData('ContentBlock'),
      },
    });
    await nextTick();

    expect(wrapper.find('.content-block').exists()).toBe(true);
    expect(wrapper.find('.ipb-error-boundary').exists()).toBe(false);
  });

  it('shows a safe fallback when tree rendering throws', async () => {
    const wrapper = mount(PageReader, {
      props: {
        pageData: fallbackTestPageData('UnknownComponent'),
      },
    });
    await nextTick();

    expect(wrapper.find('.ipb-error-boundary').exists()).toBe(true);
    expect(wrapper.text()).toContain('This block could not be rendered.');
  });

  it('shows an invalid payload fallback when content root is missing', () => {
    const pageData = makePageData();
    const invalidPageData = { ...pageData, content: null } as unknown as IPageData;

    const wrapper = mount(PageReader, {
      props: { pageData: invalidPageData },
    });

    expect(wrapper.find('.ipb-page-reader__invalid').exists()).toBe(true);
    expect(wrapper.text()).toContain('This page data is invalid and cannot be rendered safely.');
    const diagnostics = consoleErrorSpy.mock.calls.map((call) => String(call[0] ?? ''));
    expect(
      diagnostics.some((message) =>
        message.includes('Invalid pageData payload detected. Rendering continues with degraded behavior.'),
      ),
    ).toBe(true);
  });
});
