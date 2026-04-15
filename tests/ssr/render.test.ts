// @vitest-environment node

import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import PageBuilder from '@/components/PageBuilder.vue';
import { clearRegistry, registerComponents } from '@/core/registry';
import type { IComponentDefinition } from '@/types/component';
import type { INode, IPageData } from '@/types/node';

const SsrLayout = defineComponent({
  name: 'SsrLayout',
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'ssr-layout' }, [
        h('main', { class: 'ssr-main' }, slots.default?.()),
        h('aside', { class: 'ssr-sidebar' }, slots.sidebar?.()),
      ]);
  },
});

const SsrContainer = defineComponent({
  name: 'SsrContainer',
  setup(_, { slots }) {
    return () => h('section', { class: 'ssr-container' }, slots.default?.());
  },
});

const SsrText = defineComponent({
  name: 'SsrText',
  props: {
    text: { type: String, default: '' },
  },
  setup(props) {
    return () => h('p', { class: 'ssr-text' }, props.text);
  },
});

function toDefinition(
  name: string,
  component: IComponentDefinition['component'],
  slots: IComponentDefinition['slots'],
  category: IComponentDefinition['category'] = 'content',
): IComponentDefinition {
  return {
    name,
    label: name,
    category,
    component,
    slots,
    editableProps: [],
  };
}

function makePageData(tree: INode, variables: Record<string, string>): IPageData {
  return {
    meta: {
      id: 'ssr-page-1',
      name: 'SSR Page',
      url: '/ssr-page',
      status: 'draft',
    },
    tree,
    contentRootId: tree.id,
    maxId: 1000,
    variables,
  };
}

async function renderReadMode(pageData: IPageData): Promise<string> {
  const app = createSSRApp(PageBuilder, {
    pageData,
    mode: 'read',
  });
  return renderToString(app);
}

describe('SSR render (read mode)', () => {
  beforeEach(() => {
    clearRegistry();
    registerComponents([
      toDefinition(
        'SsrLayout',
        SsrLayout,
        [
          { name: 'default', label: 'Default' },
          { name: 'sidebar', label: 'Sidebar' },
        ],
        'layout',
      ),
      toDefinition(
        'SsrContainer',
        SsrContainer,
        [{ name: 'default', label: 'Default' }],
        'layout',
      ),
      toDefinition('SsrText', SsrText, [], 'content'),
    ]);
  });

  afterEach(() => {
    clearRegistry();
  });

  it('renders to string in Node without browser globals', async () => {
    expect((globalThis as { window?: unknown }).window).toBeUndefined();
    expect((globalThis as { document?: unknown }).document).toBeUndefined();

    const pageData = makePageData(
      {
        id: 1,
        name: 'SsrLayout',
        slot: null,
        props: {},
        children: [
          {
            id: 2,
            name: 'SsrText',
            slot: 'default',
            props: { text: 'Welcome {{ USER }}' },
            children: [],
          },
        ],
      },
      { USER: 'Alice' },
    );

    const html = await renderReadMode(pageData);

    expect(html).toContain('ipb-page-reader');
    expect(html).toContain('Welcome Alice');
  });

  it('interpolates variables and renders children recursively across slots', async () => {
    const pageData = makePageData(
      {
        id: 1,
        name: 'SsrLayout',
        slot: null,
        props: {},
        children: [
          {
            id: 2,
            name: 'SsrText',
            slot: 'default',
            props: { text: 'Top {{ USER }}' },
            children: [],
          },
          {
            id: 3,
            name: 'SsrContainer',
            slot: 'sidebar',
            props: {},
            children: [
              {
                id: 4,
                name: 'SsrText',
                slot: 'default',
                props: { text: 'Sidebar {{ PLAN }}' },
                children: [],
              },
            ],
          },
          {
            id: 5,
            name: 'SsrContainer',
            slot: 'default',
            props: {},
            children: [
              {
                id: 6,
                name: 'SsrText',
                slot: 'default',
                props: { text: 'Depth {{ LEVEL }}' },
                children: [],
              },
            ],
          },
        ],
      },
      {
        USER: 'Alice',
        PLAN: 'Pro',
        LEVEL: '2',
      },
    );

    const html = await renderReadMode(pageData);

    expect(html).toContain('Top Alice');
    expect(html).toContain('Sidebar Pro');
    expect(html).toContain('Depth 2');
    expect(html.match(/class="ssr-text"/g)).toHaveLength(3);
  });
});
