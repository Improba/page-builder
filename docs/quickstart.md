# Quick Start

This guide helps you get started quickly with `@improba/page-builder` in a Vue 3 application.

## Prerequisites

- **Node.js** ≥ 22
- **Vue** ^3.4

## 1. Installation

```bash
npm install @improba/page-builder
```

## 2. Plugin setup

In your app entry point (e.g. `main.ts`):

```ts
import { createApp } from 'vue';
import { PageBuilderPlugin } from '@improba/page-builder';
import '@improba/page-builder/style.css';
import App from './App.vue';

const app = createApp(App);
app.use(PageBuilderPlugin);
app.mount('#app');
```

Optional plugin options:

```ts
app.use(PageBuilderPlugin, {
  registerBuiltIn: true,   // Built-in components (PbColumn, PbRow, etc.)
  components: [],          // Custom component definitions
  globalName: 'PageBuilder',
});
```

## 3. Display a page (read mode)

Use the `<PageBuilder>` component with an `IPageData` object and `mode="read"`:

```vue
<script setup lang="ts">
import { PageBuilder } from '@improba/page-builder';
import type { IPageData } from '@improba/page-builder';

const pageData: IPageData = {
  meta: { id: '1', name: 'Home', url: '/', status: 'published' },
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
        props: { content: '<h1>Welcome</h1><p>First page.</p>' },
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

**Read mode** displays the page statically, with no editor UI. It is SSR-compatible (Nuxt, etc.).

## 4. Enable editing (edit mode)

For a WYSIWYG editor with component palette, property panel, and undo/redo:

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
  // Send payload.content, payload.maxId to the backend
}

function onChange() {
  // Optional: react to changes (e.g. "unsaved" indicator)
}
</script>
```

In edit mode, the user can:

- Drag and drop components from the palette
- Select a node and edit its props in the right panel
- Undo / redo
- Preview desktop / tablet / mobile
- Save via the Save button (`@save` event)

## 5. Data from an API

In practice, `pageData` often comes from the backend. For a full specification of routes and contracts (GET page, save, validation, media), see **[Backend integration](./backend-integration.md)**.

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

## 6. Custom components (optional)

To register your own blocks (hero, card, etc.):

```ts
import { registerComponent } from '@improba/page-builder';
import type { IComponentDefinition } from '@improba/page-builder';
import MyHero from './MyHero.vue';

const def: IComponentDefinition = {
  name: 'MyHero',
  label: 'Hero Banner',
  description: 'Hero section with title and CTA.',
  category: 'content',
  component: MyHero,
  slots: [{ name: 'default', label: 'Content' }],
  editableProps: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'image', label: 'Image', type: 'image' },
  ],
  defaultProps: { title: 'Title' },
};

registerComponent(def);
```

Do this registration before the first render (e.g. in `main.ts` or a dedicated module).

## Next steps

- **[Backend integration](./backend-integration.md)** — Routes, contracts (IPageData, IPageSavePayload), validation, media
- **[Architecture](./architecture/overview.md)** — Project structure and rendering flow
- **[Read mode](./features/read-mode.md)** — Rendering, layout, SSR
- **[Edit mode](./features/edit-mode.md)** — Toolbar, palette, property panel
- **[JSON format](./features/json-format.md)** — `INode`, `IPageData`, variables
- **[Component registry](./features/component-registry.md)** — Registration and metadata
- **[API reference](./api/README.md)** — Exposed types and functions
