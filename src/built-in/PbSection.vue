<script lang="ts">
  import type { IComponentDefinition } from '@/types/component';

  export const builderOptions: IComponentDefinition = {
    name: 'PbSection',
    label: 'Section',
    description: 'A full-width section with optional background.',
    category: 'layout',
    icon: '▬',
    component: {} as any,
    slots: [{ name: 'default', label: 'Content' }],
    editableProps: [
      { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: 'transparent' },
      { key: 'backgroundImage', label: 'Background Image', type: 'image' },
      { key: 'padding', label: 'Padding', type: 'text', defaultValue: '48px 24px' },
      { key: 'maxWidth', label: 'Max Content Width', type: 'text', defaultValue: '1200px' },
    ],
    defaultProps: { backgroundColor: 'transparent', padding: '48px 24px', maxWidth: '1200px' },
  };
</script>

<script setup lang="ts">
  import { computed } from 'vue';
  import { sanitizeUrlByKind } from '@/core/sanitize';

  const props = defineProps({
    backgroundColor: { type: String, default: 'transparent' },
    backgroundImage: { type: String, default: '' },
    padding: { type: String, default: '48px 24px' },
    maxWidth: { type: String, default: '1200px' },
  });

  const safeBackgroundImage = computed(() => sanitizeUrlByKind(props.backgroundImage, 'background'));
  const cssBackgroundImage = computed(() => {
    if (!safeBackgroundImage.value) return undefined;
    const escapedUrl = safeBackgroundImage.value.replace(/["\\]/g, '\\$&');
    return `url("${escapedUrl}")`;
  });

  const outerStyle = computed(() => ({
    width: '100%',
    backgroundColor: props.backgroundColor,
    backgroundImage: cssBackgroundImage.value,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: props.padding,
  }));

  const innerStyle = computed(() => ({
    maxWidth: props.maxWidth,
    margin: '0 auto',
    width: '100%',
  }));
</script>

<template>
  <section :style="outerStyle">
    <div :style="innerStyle">
      <slot />
    </div>
  </section>
</template>
