<script lang="ts">
  import type { IComponentDefinition } from '@/types/component';

  export const builderOptions: IComponentDefinition = {
    name: 'PbColumn',
    label: 'Column',
    description: 'Vertical flex container for stacking components.',
    category: 'layout',
    icon: '⬜',
    component: {} as any, // self-reference set at registration
    slots: [{ name: 'default', label: 'Content' }],
    editableProps: [
      { key: 'width', label: 'Width', type: 'text', defaultValue: '' },
      { key: 'gap', label: 'Gap', type: 'text', defaultValue: '16px' },
      { key: 'padding', label: 'Padding', type: 'text', defaultValue: '0' },
      { key: 'align', label: 'Align Items', type: 'select', defaultValue: 'stretch', options: [
        { label: 'Stretch', value: 'stretch' },
        { label: 'Start', value: 'flex-start' },
        { label: 'Center', value: 'center' },
        { label: 'End', value: 'flex-end' },
      ]},
    ],
    defaultProps: { width: '', gap: '16px', padding: '0', align: 'stretch' },
  };
</script>

<script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps({
    width: { type: String, default: '' },
    gap: { type: String, default: '16px' },
    padding: { type: String, default: '0' },
    align: { type: String, default: 'stretch' },
  });

  const style = computed(() => ({
    display: 'flex',
    flexDirection: 'column' as const,
    gap: props.gap,
    padding: props.padding,
    alignItems: props.align,
    ...(props.width ? { flex: `0 0 ${props.width}`, maxWidth: props.width } : { flex: '1 1 0%', width: '100%' }),
  }));
</script>

<template>
  <div :style="style">
    <slot />
  </div>
</template>
