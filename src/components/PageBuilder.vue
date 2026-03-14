<script setup lang="ts">
  import { computed, inject, provide, type PropType, watch } from 'vue';
  import type { IPageData, INode, IPageSavePayload } from '@/types/node';
  import type { PageBuilderMode } from '@/types/editor';
  import { validateNode, validatePageData } from '@/core/validation';
  import { createPageBuilderError, reportDevDiagnostic } from '@/core/errors';
  import {
    DEFAULT_LOCALE,
    PAGE_BUILDER_I18N_KEY,
    PAGE_BUILDER_I18N_OPTIONS_KEY,
    createTranslator,
    defaultTranslations,
    mergeTranslations,
    type TranslationDictionary,
  } from '@/i18n';
  import PageReader from './reader/PageReader.vue';
  import PageEditor from './editor/PageEditor.vue';

  const props = defineProps({
    pageData: {
      type: Object as PropType<IPageData>,
      required: true,
    },
    mode: {
      type: String as PropType<PageBuilderMode>,
      default: 'read',
    },
    locale: {
      type: String,
      default: undefined,
    },
    messages: {
      type: Object as PropType<TranslationDictionary>,
      default: undefined,
    },
  });

  const reportedDiagnostics = new Set<string>();

  function reportOnce(key: string, message: string, details?: Record<string, unknown>) {
    if (reportedDiagnostics.has(key)) return;
    reportedDiagnostics.add(key);
    reportDevDiagnostic('PageBuilder', createPageBuilderError('INVALID_PAGE_DATA', message, { details }));
  }

  const pageData = computed(() => props.pageData);
  const mode = computed<PageBuilderMode>(() => {
    if (props.mode === 'read' || props.mode === 'edit') return props.mode;
    reportOnce(
      'invalid-mode',
      `[PageBuilder] Unknown mode "${String(props.mode)}". Falling back to "read".`,
      { mode: props.mode },
    );
    return 'read';
  });

  const pageValidationResult = computed(() => validatePageData(pageData.value));
  const canRenderEditor = computed(() => {
    const contentResult = validateNode(pageData.value.content, 'content');
    const layoutResult = validateNode(pageData.value.layout, 'layout');
    return contentResult.isValid && layoutResult.isValid;
  });
  const showEditModeFallback = computed(() => mode.value === 'edit' && !canRenderEditor.value);
  const pluginI18nOptions = inject(PAGE_BUILDER_I18N_OPTIONS_KEY, null);
  const resolvedLocale = computed(() => props.locale ?? pluginI18nOptions?.locale ?? DEFAULT_LOCALE);
  const mergedMessages = computed(() =>
    mergeTranslations(defaultTranslations, pluginI18nOptions?.messages, props.messages),
  );
  const t = createTranslator(() => resolvedLocale.value, () => mergedMessages.value);

  watch(
    pageValidationResult,
    (result) => {
      if (result.isValid) return;
      reportOnce(
        'invalid-page-data',
        '[PageBuilder] Invalid pageData payload detected. Rendering continues with degraded behavior.',
        { errors: result.errors },
      );
    },
    { immediate: true },
  );

  defineEmits<{
    save: [payload: IPageSavePayload];
    change: [tree: INode];
  }>();

  provide(PAGE_BUILDER_I18N_KEY, {
    locale: resolvedLocale,
    t,
  });
</script>

<template>
  <div v-if="showEditModeFallback" class="ipb-page-builder__warning" role="alert">
    {{ t('pageBuilder.warning.invalidEditMode') }}
  </div>
  <PageReader v-if="mode === 'read' || showEditModeFallback" :page-data="pageData" />
  <PageEditor
    v-else
    :page-data="pageData"
    @save="$emit('save', $event)"
    @change="$emit('change', $event)"
  />
</template>

<style scoped>
  .ipb-page-builder__warning {
    margin-bottom: 0.5rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid #f8d7a8;
    border-radius: 0.375rem;
    background-color: #fff8ec;
    color: #7d4a00;
    font-size: 0.875rem;
  }
</style>
