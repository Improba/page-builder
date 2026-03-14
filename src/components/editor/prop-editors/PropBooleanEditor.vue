<script setup lang="ts">
  import { computed, useAttrs } from 'vue';
  import { usePageBuilderI18n } from '@/i18n';

  defineOptions({
    inheritAttrs: false,
  });

  defineProps({
    modelValue: { type: Boolean, default: false },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
  }>();

  function handleChange(event: Event) {
    emit('update:modelValue', (event.target as HTMLInputElement).checked);
  }

  const { t } = usePageBuilderI18n();
  const attrs = useAttrs();
  const checkboxAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs as Record<string, unknown>;
    return rest;
  });
</script>

<template>
  <label class="ipb-prop-editor ipb-prop-editor--boolean" :class="attrs.class" :style="attrs.style">
    <input v-bind="checkboxAttrs" type="checkbox" :checked="modelValue" @change="handleChange" />
    <span>{{ modelValue ? t('propBoolean.enabled') : t('propBoolean.disabled') }}</span>
  </label>
</template>

<style scoped>
  .ipb-prop-editor--boolean {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    user-select: none;
  }

  .ipb-prop-editor--boolean input:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 2px;
  }
</style>
