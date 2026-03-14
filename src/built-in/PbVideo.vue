<script lang="ts">
  import type { IComponentDefinition } from '@/types/component';

  export const builderOptions: IComponentDefinition = {
    name: 'PbVideo',
    label: 'Vidéo',
    description: 'Affiche une vidéo avec URL, poster optionnel et options de lecture.',
    category: 'media',
    icon: '🎬',
    component: {} as any,
    slots: [],
    editableProps: [
      { key: 'src', label: 'URL de la vidéo', type: 'url', required: true },
      { key: 'poster', label: 'Image de couverture (poster)', type: 'image' },
      { key: 'width', label: 'Largeur', type: 'text', defaultValue: '100%' },
      { key: 'controls', label: 'Afficher les contrôles', type: 'boolean', defaultValue: true },
      { key: 'autoplay', label: 'Lecture automatique', type: 'boolean', defaultValue: false },
      { key: 'muted', label: 'Muet', type: 'boolean', defaultValue: false },
      { key: 'loop', label: 'Boucle', type: 'boolean', defaultValue: false },
    ],
    defaultProps: {
      src: '',
      poster: '',
      width: '100%',
      controls: true,
      autoplay: false,
      muted: false,
      loop: false,
    },
  };
</script>

<script setup lang="ts">
  import { computed } from 'vue';
  import { sanitizeUrlByKind } from '@/core/sanitize';

  const props = withDefaults(
    defineProps<{
      src: string;
      poster?: string;
      width?: string;
      controls?: boolean;
      autoplay?: boolean;
      muted?: boolean;
      loop?: boolean;
    }>(),
    {
      poster: '',
      width: '100%',
      controls: true,
      autoplay: false,
      muted: false,
      loop: false,
    },
  );

  const style = computed(() => ({
    width: props.width,
    maxWidth: '100%',
    display: 'block',
  }));

  const safeSrc = computed(() => sanitizeUrlByKind(props.src, 'media'));
  const safePoster = computed(() =>
    props.poster?.trim() ? sanitizeUrlByKind(props.poster, 'media') : undefined,
  );
</script>

<template>
  <video
    v-if="safeSrc"
    :src="safeSrc"
    :poster="safePoster"
    :controls="controls"
    :autoplay="autoplay"
    :muted="muted"
    :loop="loop"
    :style="style"
    playsinline
  />
</template>
