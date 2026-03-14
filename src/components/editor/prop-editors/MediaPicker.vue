<script setup lang="ts">
  import { computed, useAttrs } from 'vue';
  import { sanitizeUrlByKind } from '@/core/sanitize';
  import { usePageBuilderI18n } from '@/i18n';

  defineOptions({
    inheritAttrs: false,
  });

  const props = defineProps({
    modelValue: { type: String, default: '' },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    upload: [];
  }>();

  const rawValue = computed(() => props.modelValue.trim());
  const safePreviewUrl = computed(() => sanitizeUrlByKind(rawValue.value, 'media'));
  const hasValue = computed(() => rawValue.value.length > 0);
  const canPreview = computed(() => safePreviewUrl.value.length > 0);

  function handleInput(event: Event) {
    const inputValue = (event.target as HTMLInputElement).value;
    emit('update:modelValue', sanitizeUrlByKind(inputValue, 'media'));
  }

  function handleClear() {
    emit('update:modelValue', '');
  }

  function handleUploadPlaceholder() {
    emit('upload');
  }

  const { t } = usePageBuilderI18n();
  const attrs = useAttrs();
  const inputAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs as Record<string, unknown>;
    return rest;
  });
</script>

<template>
  <div class="ipb-media-picker" :class="attrs.class" :style="attrs.style">
    <div class="ipb-media-picker__controls">
      <input
        v-bind="inputAttrs"
        class="ipb-media-picker__input"
        type="url"
        :value="modelValue"
        :placeholder="t('mediaPicker.input.placeholder')"
        @input="handleInput"
      />
      <button class="ipb-media-picker__btn" type="button" :disabled="!hasValue" @click="handleClear">
        {{ t('mediaPicker.clear') }}
      </button>
      <button class="ipb-media-picker__btn" type="button" @click="handleUploadPlaceholder">
        {{ t('mediaPicker.upload') }}
      </button>
    </div>

    <div class="ipb-media-picker__preview">
      <img
        v-if="hasValue && canPreview"
        class="ipb-media-picker__image"
        :src="safePreviewUrl"
        :alt="t('mediaPicker.preview.alt')"
      />
      <p v-else class="ipb-media-picker__empty">{{ t('mediaPicker.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
  .ipb-media-picker {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ipb-media-picker__controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
  }

  .ipb-media-picker__input {
    min-width: 0;
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
  }

  .ipb-media-picker__btn {
    padding: 6px 8px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    background: var(--ipb-drawer-bg, #fff);
    cursor: pointer;
    font-size: 12px;
  }

  .ipb-media-picker__input:focus-visible,
  .ipb-media-picker__btn:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }

  .ipb-media-picker__btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ipb-media-picker__preview {
    border: 1px dashed var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    padding: 6px;
    min-height: 88px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ipb-bg-subtle, #fafafa);
  }

  .ipb-media-picker__image {
    max-width: 100%;
    max-height: 140px;
    object-fit: contain;
    display: block;
  }

  .ipb-media-picker__empty {
    margin: 0;
    font-size: 12px;
    color: var(--ipb-text-muted, #6b7280);
    text-align: center;
  }
</style>
