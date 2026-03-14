import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import PageBuilder from '@/components/PageBuilder.vue';
import { usePageBuilderI18n, type TranslationDictionary } from '@/i18n';
import type { IPageData } from '@/types/node';

const pageData: IPageData = {
  meta: {
    id: 'page-i18n',
    name: 'Page i18n',
    url: '/page-i18n',
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

describe('PageBuilder i18n wiring', () => {
  const StubEditor = defineComponent({
    name: 'PageEditor',
    setup() {
      const { t } = usePageBuilderI18n();
      return { t };
    },
    template: `
      <div>
        <span class="stub-editor-save">{{ t('toolbar.save') }}</span>
        <span class="stub-editor-save-title">{{ t('toolbar.save.title') }}</span>
      </div>
    `,
  });

  it('applies locale/messages from PageBuilder props to editor toolbar labels', () => {
    const messages: TranslationDictionary = {
      fr: {
        'toolbar.save': 'Enregistrer',
        'toolbar.save.title': 'Enregistrer (Ctrl/Cmd+S)',
        'toolbar.undo.title': 'Annuler (Ctrl/Cmd+Z)',
      },
    };

    const wrapper = mount(PageBuilder, {
      props: {
        pageData,
        mode: 'edit',
        locale: 'fr',
        messages,
      },
      global: {
        stubs: {
          PageEditor: StubEditor,
          PageReader: true,
        },
      },
    });

    expect(wrapper.get('.stub-editor-save').text()).toBe('Enregistrer');
    expect(wrapper.get('.stub-editor-save-title').text()).toBe('Enregistrer (Ctrl/Cmd+S)');
  });
});
