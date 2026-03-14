<script setup lang="ts">
  import { computed, useAttrs } from 'vue';

  defineOptions({
    inheritAttrs: false,
  });

  const props = defineProps({
    modelValue: { type: String, default: '' },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: string];
  }>();

  const pickerValue = computed(() => {
    const value = props.modelValue.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
      const chars = value.slice(1).split('');
      return `#${chars.map((char) => `${char}${char}`).join('')}`;
    }
    return '#000000';
  });

  function handlePickerInput(event: Event) {
    emit('update:modelValue', (event.target as HTMLInputElement).value);
  }

  function handleTextInput(event: Event) {
    emit('update:modelValue', (event.target as HTMLInputElement).value);
  }

  const attrs = useAttrs();
  const inputAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs as Record<string, unknown>;
    return rest;
  });
</script>

<template>
  <div class="ipb-prop-editor ipb-prop-editor--color" :class="attrs.class" :style="attrs.style">
    <input
      v-bind="inputAttrs"
      class="ipb-prop-editor__picker"
      type="color"
      :value="pickerValue"
      @input="handlePickerInput"
    />
    <input
      v-bind="inputAttrs"
      class="ipb-prop-editor__text"
      type="text"
      :value="modelValue"
      placeholder="#000000"
      @input="handleTextInput"
    />
  </div>
</template>

<style scoped>
  .ipb-prop-editor--color {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .ipb-prop-editor__picker {
    width: 40px;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    background: var(--ipb-drawer-bg, #fff);
  }

  .ipb-prop-editor__text {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
  }

  .ipb-prop-editor__picker:focus-visible,
  .ipb-prop-editor__text:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }
</style>
