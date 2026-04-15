<script setup lang="ts">
  import { computed, type PropType, watch } from 'vue';
  import type { IPageData, INode } from '@/types/node';
  import { validatePageData } from '@/core/validation';
  import { createPageBuilderError, reportDevDiagnostic } from '@/core/errors';
  import NodeRenderer from './NodeRenderer.vue';
  import ErrorBoundary from '@/components/shared/ErrorBoundary.vue';

  const props = defineProps({
    pageData: {
      type: Object as PropType<IPageData>,
      required: true,
    },
  });

  const pageValidationResult = computed(() => validatePageData(props.pageData));
  const reportedDiagnostics = new Set<string>();

  function reportOnce(key: string, message: string, details?: Record<string, unknown>) {
    if (reportedDiagnostics.has(key)) return;
    reportedDiagnostics.add(key);
    reportDevDiagnostic('PageReader', createPageBuilderError('INVALID_PAGE_DATA', message, { details }));
  }

  watch(
    pageValidationResult,
    (result) => {
      if (result.isValid) return;
      reportOnce(
        'invalid-page-data',
        '[PageReader] Invalid pageData payload detected. Rendering continues with degraded behavior.',
        { errors: result.errors },
      );
    },
    { immediate: true },
  );

  function isNodeObject(value: unknown): value is INode {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  const safeVariables = computed<Record<string, string>>(() => {
    const rawVariables = props.pageData.variables;
    if (!rawVariables || typeof rawVariables !== 'object' || Array.isArray(rawVariables)) {
      reportOnce(
        'invalid-variables-shape',
        '[PageReader] Invalid variables payload. Falling back to an empty variable map.',
      );
      return {};
    }

    const hasInvalidEntries = Object.values(rawVariables).some((value) => typeof value !== 'string');
    if (hasInvalidEntries) {
      reportOnce(
        'invalid-variables-values',
        '[PageReader] Variables payload contains non-string values. Invalid entries were ignored.',
      );
    }

    return Object.fromEntries(
      Object.entries(rawVariables).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  });

  const readerRoot = computed<INode | null>(() => {
    const treeNode = props.pageData.tree;
    if (!isNodeObject(treeNode)) {
      reportOnce('invalid-tree', '[PageReader] Invalid tree node. Nothing can be rendered.');
      return null;
    }
    return treeNode;
  });
</script>

<template>
  <div class="ipb-page-reader">
    <ErrorBoundary
      v-if="readerRoot"
      fallback-message="This page could not be fully rendered."
      :show-details-in-dev="true"
      diagnostic-context="PageReader"
    >
      <NodeRenderer :node="readerRoot" :variables="safeVariables" />
    </ErrorBoundary>
    <div v-else class="ipb-page-reader__invalid" role="alert">
      This page data is invalid and cannot be rendered safely.
    </div>
  </div>
</template>

<style scoped>
  .ipb-page-reader {
    width: 100%;
    min-height: 100%;
  }

  .ipb-page-reader__invalid {
    padding: 0.75rem;
    border: 1px solid #f3d1d1;
    border-radius: 0.375rem;
    background-color: #fff5f5;
    color: #7a1f1f;
    font-size: 0.875rem;
  }
</style>
