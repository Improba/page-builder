<script lang="ts">
  import type { IComponentDefinition } from '@/types/component';

  export const builderOptions: IComponentDefinition = {
    name: 'PbText',
    label: 'Text',
    description: 'A text block with HTML support.',
    category: 'content',
    icon: 'T',
    component: {} as any,
    slots: [],
    editableProps: [
      { key: 'content', label: 'Content', type: 'richtext', defaultValue: '<p>Enter text here</p>' },
      { key: 'tag', label: 'HTML Tag', type: 'select', defaultValue: 'div', options: [
        { label: 'div', value: 'div' },
        { label: 'p', value: 'p' },
        { label: 'span', value: 'span' },
        { label: 'h1', value: 'h1' },
        { label: 'h2', value: 'h2' },
        { label: 'h3', value: 'h3' },
      ]},
    ],
    defaultProps: { content: '<p>Enter text here</p>', tag: 'div' },
  };
</script>

<script setup lang="ts">
  import { computed } from 'vue';
  import { normalizeSafeHtmlTag, sanitizeRichTextHtml } from '@/core/sanitize';

  const props = defineProps({
    content: { type: String, default: '' },
    tag: { type: String, default: 'div' },
  });

  const safeTag = computed(() => normalizeSafeHtmlTag(props.tag));
  const safeHtmlContent = computed(() => sanitizeRichTextHtml(props.content));
</script>

<template>
  <component :is="safeTag" v-html="safeHtmlContent" />
</template>
