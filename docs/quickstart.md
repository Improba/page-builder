# Quick Start

Ce guide permet de démarrer rapidement avec `@improba/page-builder` dans une application Vue 3.

## Prérequis

- **Node.js** ≥ 22
- **Vue** ^3.4

## 1. Installation

```bash
npm install @improba/page-builder
```

## 2. Configuration du plugin

Dans le point d’entrée de votre app (par ex. `main.ts`) :

```ts
import { createApp } from 'vue';
import { PageBuilderPlugin } from '@improba/page-builder';
import '@improba/page-builder/style.css';
import App from './App.vue';

const app = createApp(App);
app.use(PageBuilderPlugin);
app.mount('#app');
```

Options du plugin (optionnel) :

```ts
app.use(PageBuilderPlugin, {
  registerBuiltIn: true,   // Composants intégrés (PbColumn, PbRow, etc.)
  components: [],          // Définitions de composants personnalisés
  globalName: 'PageBuilder',
});
```

## 3. Afficher une page (mode lecture)

Utilisez le composant `<PageBuilder>` avec un objet `IPageData` et `mode="read"` :

```vue
<script setup lang="ts">
import { PageBuilder } from '@improba/page-builder';
import type { IPageData } from '@improba/page-builder';

const pageData: IPageData = {
  meta: { id: '1', name: 'Accueil', url: '/', status: 'published' },
  content: {
    id: 0,
    name: 'PbColumn',
    slot: null,
    props: { gap: '16px' },
    children: [
      {
        id: 1,
        name: 'PbText',
        slot: 'default',
        props: { content: '<h1>Bienvenue</h1><p>Première page.</p>' },
        children: [],
      },
    ],
  },
  layout: { id: 100, name: 'PbContainer', slot: null, props: {}, children: [] },
  maxId: 100,
  variables: {},
};
</script>

<template>
  <PageBuilder :page-data="pageData" mode="read" />
</template>
```

Le **mode lecture** affiche la page de façon statique, sans interface d’édition. Il est compatible SSR (Nuxt, etc.).

## 4. Activer l’édition (mode édition)

Pour un éditeur WYSIWYG avec palette de composants, panneau de propriétés et undo/redo :

```vue
<template>
  <PageBuilder
    :page-data="pageData"
    mode="edit"
    @save="onSave"
    @change="onChange"
  />
</template>

<script setup lang="ts">
function onSave(payload: IPageSavePayload) {
  // Envoyer payload.content, payload.maxId au backend
}

function onChange() {
  // Optionnel : réagir aux modifications (ex. indicateur "non enregistré")
}
</script>
```

En mode édition, l’utilisateur peut :

- Glisser-déposer des composants depuis la palette
- Sélectionner un nœud et modifier ses props dans le panneau droit
- Annuler / rétablir
- Prévisualiser desktop / tablette / mobile
- Enregistrer via le bouton Sauvegarder (événement `@save`)

## 5. Données depuis une API

En pratique, `pageData` vient souvent du backend :

```ts
const pageData = ref<IPageData | null>(null);

onMounted(async () => {
  const res = await fetch('/api/pages/1');
  pageData.value = await res.json();
});
```

```vue
<template>
  <PageBuilder v-if="pageData" :page-data="pageData" mode="read" />
</template>
```

## 6. Composants personnalisés (optionnel)

Pour enregistrer vos propres blocs (hero, carte, etc.) :

```ts
import { registerComponent } from '@improba/page-builder';
import type { IComponentDefinition } from '@improba/page-builder';
import MonHero from './MonHero.vue';

const def: IComponentDefinition = {
  name: 'MonHero',
  label: 'Bandeau Hero',
  description: 'Section hero avec titre et CTA.',
  category: 'content',
  component: MonHero,
  slots: [{ name: 'default', label: 'Contenu' }],
  editableProps: [
    { key: 'titre', label: 'Titre', type: 'text', required: true },
    { key: 'image', label: 'Image', type: 'image' },
  ],
  defaultProps: { titre: 'Titre' },
};

registerComponent(def);
```

Faites cet enregistrement avant le premier rendu (par ex. dans `main.ts` ou un module dédié).

## Suite

- **[Architecture](./architecture/overview.md)** — Structure du projet et flux de rendu
- **[Mode lecture](./features/read-mode.md)** — Rendu, layout, SSR
- **[Mode édition](./features/edit-mode.md)** — Toolbar, palette, panneau de propriétés
- **[Format JSON](./features/json-format.md)** — `INode`, `IPageData`, variables
- **[Registre de composants](./features/component-registry.md)** — Enregistrement et métadonnées
- **[Référence API](./api/README.md)** — Types et fonctions exposées
