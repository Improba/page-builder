<script lang="ts">
  import type { IComponentDefinition } from '@/types/component';

  export const builderOptions: IComponentDefinition = {
    name: 'PbContainer',
    label: 'Container',
    description: 'A centered container with max width.',
    category: 'layout',
    icon: '☐',
    component: {} as any,
    slots: [{ name: 'default', label: 'Content' }],
    editableProps: [
      { key: 'maxWidth', label: 'Max Width', type: 'text', defaultValue: '100%' },
      { key: 'padding', label: 'Padding', type: 'text', defaultValue: '0 24px' },
    ],
    defaultProps: { maxWidth: '100%', padding: '0 24px' },
  };
</script>

<script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps({
    maxWidth: { type: String, default: '100%' },
    padding: { type: String, default: '0 24px' },
  });

  const style = computed(() => ({
    maxWidth: props.maxWidth,
    margin: '0 auto',
    padding: props.padding,
    width: '100%',
    boxSizing: 'border-box' as const,
  }));
</script>

<template>
  <div :style="style">
    <slot />
  </div>
</template>
