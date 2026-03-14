<script setup lang="ts">
  import { computed, onErrorCaptured, ref } from 'vue';
  import { createPageBuilderError, reportDevDiagnostic, toErrorMessage } from '@/core/errors';

  const props = withDefaults(
    defineProps<{
      fallbackMessage?: string;
      showDetailsInDev?: boolean;
      diagnosticContext?: string;
    }>(),
    {
      fallbackMessage: 'Something went wrong while rendering this section.',
      showDetailsInDev: false,
      diagnosticContext: 'ErrorBoundary',
    },
  );

  const hasError = ref(false);
  const capturedError = ref<unknown>(null);
  const errorInfo = ref('');

  const shouldShowDetails = computed(() => import.meta.env.DEV && props.showDetailsInDev);
  const errorDetails = computed(() => {
    if (!capturedError.value) return '';
    if (capturedError.value instanceof Error) return capturedError.value.message;
    return String(capturedError.value);
  });
  const errorDebugText = computed(() =>
    [errorDetails.value, errorInfo.value].filter((segment) => Boolean(segment)).join('\n'),
  );

  onErrorCaptured((error, _instance, info) => {
    hasError.value = true;
    capturedError.value = error;
    errorInfo.value = info;

    reportDevDiagnostic(
      props.diagnosticContext,
      createPageBuilderError(
        'RENDER_FAILURE',
        `[PageBuilder] ${props.diagnosticContext} captured a render error: ${toErrorMessage(error)}`,
        {
          cause: error,
          details: {
            info,
          },
        },
      ),
    );

    return false;
  });
</script>

<template>
  <slot v-if="!hasError" />
  <div v-else class="ipb-error-boundary" role="alert">
    <p class="ipb-error-boundary__message">
      {{ fallbackMessage }}
    </p>

    <pre v-if="shouldShowDetails && errorDebugText" class="ipb-error-boundary__details">
      {{ errorDebugText }}
    </pre>
  </div>
</template>

<style scoped>
  .ipb-error-boundary {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #f3d1d1;
    border-radius: 0.375rem;
    background-color: #fff5f5;
    color: #7a1f1f;
  }

  .ipb-error-boundary__message {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .ipb-error-boundary__details {
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    color: #5f1b1b;
  }
</style>
