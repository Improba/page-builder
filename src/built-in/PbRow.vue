<script lang="ts">
  import type { IComponentDefinition } from '@/types/component';

  export const builderOptions: IComponentDefinition = {
    name: 'PbRow',
    label: 'Row',
    description: 'Horizontal flex container for side-by-side components.',
    category: 'layout',
    icon: '⬛',
    component: {} as any,
    slots: [{ name: 'default', label: 'Content' }],
    editableProps: [
      { key: 'gap', label: 'Gap', type: 'text', defaultValue: '16px' },
      { key: 'wrap', label: 'Wrap', type: 'boolean', defaultValue: true },
      { key: 'justify', label: 'Justify', type: 'select', defaultValue: 'flex-start', options: [
        { label: 'Start', value: 'flex-start' },
        { label: 'Center', value: 'center' },
        { label: 'End', value: 'flex-end' },
        { label: 'Space Between', value: 'space-between' },
        { label: 'Space Around', value: 'space-around' },
      ]},
    ],
    defaultProps: { gap: '16px', wrap: true, justify: 'flex-start' },
  };
</script>

<script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps({
    gap: { type: String, default: '16px' },
    wrap: { type: Boolean, default: true },
    justify: { type: String, default: 'flex-start' },
  });

  const style = computed(() => ({
    display: 'flex',
    flexDirection: 'row' as const,
    gap: props.gap,
    flexWrap: props.wrap ? ('wrap' as const) : ('nowrap' as const),
    justifyContent: props.justify,
    width: '100%',
  }));
</script>

<template>
  <div :style="style">
    <slot />
  </div>
</template>
