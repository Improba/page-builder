<script setup lang="ts">
  const props = defineProps({
    modelValue: { type: [String, Number, Boolean], default: '' },
    placeholder: { type: String, default: '' },
  });

  const emit = defineEmits<{
    'update:modelValue': [value: string];
  }>();

  function handleInput(event: Event) {
    emit('update:modelValue', (event.target as HTMLInputElement).value);
  }
</script>

<template>
  <input
    class="ipb-prop-editor ipb-prop-editor--text"
    type="text"
    :value="String(props.modelValue ?? '')"
    :placeholder="placeholder"
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
