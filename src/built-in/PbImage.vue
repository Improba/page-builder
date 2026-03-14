<script lang="ts">
  import type { IComponentDefinition } from '@/types/component';

  export const builderOptions: IComponentDefinition = {
    name: 'PbImage',
    label: 'Image',
    description: 'Displays an image with optional alt text.',
    category: 'media',
    icon: '🖼',
    component: {} as any,
    slots: [],
    editableProps: [
      { key: 'src', label: 'Image URL', type: 'image', required: true },
      { key: 'alt', label: 'Alt Text', type: 'text', defaultValue: '' },
      { key: 'width', label: 'Width', type: 'text', defaultValue: '100%' },
      { key: 'objectFit', label: 'Object Fit', type: 'select', defaultValue: 'cover', options: [
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Fill', value: 'fill' },
        { label: 'None', value: 'none' },
      ]},
    ],
    defaultProps: { src: '', alt: '', width: '100%', objectFit: 'cover' },
  };
</script>

<script setup lang="ts">
  import { computed } from 'vue';
  import { sanitizeUrlByKind } from '@/core/sanitize';

  const props = defineProps({
    src: { type: String, required: true },
    alt: { type: String, default: '' },
    width: { type: String, default: '100%' },
    objectFit: { type: String, default: 'cover' },
  });

  const style = computed(() => ({
    width: props.width,
    objectFit: props.objectFit as any,
    display: 'block',
    maxWidth: '100%',
  }));

  const safeSrc = computed(() => sanitizeUrlByKind(props.src, 'media'));
</script>

<template>
  <img v-if="safeSrc" :src="safeSrc" :alt="alt" :style="style" loading="lazy" />
</template>
