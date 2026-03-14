<script setup lang="ts">
  import { computed } from 'vue';
  import type { IPropDefinition } from '@/types/component';
  import { usePageBuilderI18n } from '@/i18n';

  const props = defineProps({
    modelValue: { type: [String, Number, Boolean], default: undefined },
    options: {
      type: Array as () => IPropDefinition['options'],
      default: () => [],
    },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: string | number | boolean | undefined];
  }>();

  const selectedIndex = computed(() => {
    if (!props.options || props.options.length === 0) return '';
    const idx = props.options.findIndex((option) => option.value === props.modelValue);
    if (idx >= 0) return String(idx);
    return '0';
  });

  function handleChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value === '' || !props.options) {
      emit('update:modelValue', undefined);
      return;
    }

    const option = props.options[Number(value)];
    emit('update:modelValue', option?.value);
  }

  const { t } = usePageBuilderI18n();
</script>

<template>
  <select class="ipb-prop-editor ipb-prop-editor--select" :value="selectedIndex" @change="handleChange">
    <option v-if="!options || options.length === 0" value="">{{ t('propSelect.noOptions') }}</option>
    <option v-for="(option, index) in options ?? []" :key="`${option.label}-${index}`" :value="String(index)">
      {{ option.label }}
    </option>
  </select>
</template>

<style scoped>
  .ipb-prop-editor {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
    background: var(--ipb-drawer-bg, #fff);
  }

  .ipb-prop-editor:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }
</style>
