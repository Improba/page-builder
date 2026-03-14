<script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps({
    modelValue: { type: [String, Number], default: undefined },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: number | undefined];
  }>();

  const inputValue = computed(() => {
    if (typeof props.modelValue === 'number') return String(props.modelValue);
    if (typeof props.modelValue === 'string') return props.modelValue;
    return '';
  });

  function handleInput(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();
    if (value === '') {
      emit('update:modelValue', undefined);
      return;
    }

    const parsed = Number(value);
    emit('update:modelValue', Number.isNaN(parsed) ? undefined : parsed);
  }
</script>

<template>
  <input
    class="ipb-prop-editor ipb-prop-editor--number"
    type="number"
    :value="inputValue"
    :min="min"
    :max="max"
    @input="handleInput"
  />
</template>

<style scoped>
  .ipb-prop-editor {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--ipb-border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
  }

  .ipb-prop-editor:focus-visible {
    outline: 2px solid var(--ipb-focus-color, #2563eb);
    outline-offset: 1px;
  }
</style>
