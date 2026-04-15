# @improba/page-builder

Vue 3 library for building and rendering pages from a JSON tree. It provides **read mode** (static rendering, SSR-compatible) and **edit mode** (WYSIWYG editor with component palette, property panel, drag-and-drop, undo/redo). The backend sends a single JSON contract (`IPageData`); the frontend renders it and, in edit mode, allows visual editing.

**In short:** install the Vue plugin, provide `IPageData`, and use `<PageBuilder>` with `mode="read"` for display or `mode="edit"` for editing. You can register your own components (hero, cards, etc.) and use them as blocks in the tree.

## Overview

**Edit mode** — WYSIWYG editor with component palette, property panel, and responsive preview.

![Edit mode — toolbar, palette, canvas, properties](./docs/images/edit-mode.png)

**Read mode** — Page rendering without editor UI (SSR-compatible).

![Read mode — page rendering](./docs/images/read-mode.png)

*To regenerate screenshots: `docker compose -f docker/docker-compose.yml run --rm e2e sh -lc "npm install && npm run docs:screenshots"`.*

## Features

- **Read mode** — Renders content from a JSON tree, SSR-compatible. Integrable with Nuxt or any Vue 3 app.
- **Edit mode** — WYSIWYG editor with component palette, property panel, drag-and-drop, undo/redo, and responsive preview (desktop / tablet / mobile).
- **Component registry** — Register custom Vue components (typed props, slots, edit metadata). Ships with layout and content components (PbColumn, PbRow, PbText, PbImage, etc.). Palette icons support emoji/unicode or [Lucide](https://lucide.dev/) names (`i-lucide-*`).
- **Single JSON contract** — Backend sends one `IPageData` payload; frontend renders and edits it. Clear separation of concerns.

## Quick Start

For a step-by-step guide (installation, first render, edit mode, custom components), see **[Quick Start](./docs/quickstart.md)**.

Minimal summary:

### Installation

```bash
npm install @improba/page-builder
```

### Setup

```ts
import { createApp } from 'vue';
import { PageBuilderPlugin } from '@improba/page-builder';
import '@improba/page-builder/style.css';
import App from './App.vue';

const app = createApp(App);
app.use(PageBuilderPlugin);
app.mount('#app');
```

### Usage

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
        props: { content: '<h1>Hello World</h1>' },
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

### Edit Mode

```vue
<template>
  <PageBuilder
    :page-data="pageData"
    mode="edit"
    @save="handleSave"
    @change="handleChange"
  />
</template>
```

## Custom Components

Register your own components for the page builder:

```ts
import { registerComponent } from '@improba/page-builder';
import type { IComponentDefinition } from '@improba/page-builder';
import MyHero from './MyHero.vue';

const myHero: IComponentDefinition = {
  name: 'MyHero',
  label: 'Hero Banner',
  description: 'Full-width hero section with title and CTA.',
  category: 'content',
  icon: 'i-lucide-layout-template',
  component: MyHero,
  slots: [{ name: 'default', label: 'Content' }],
  editableProps: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'backgroundImage', label: 'Background', type: 'image' },
  ],
  defaultProps: { title: 'Hero Title' },
};

registerComponent(myHero);
```

## Built-in Components

| Component | Category | Description |
|-----------|----------|-------------|
| `PbColumn` | layout | Vertical flex container |
| `PbRow` | layout | Horizontal flex container |
| `PbSection` | layout | Full-width section with background |
| `PbContainer` | layout | Centered max-width container |
| `PbText` | content | Text/HTML block |
| `PbImage` | media | Image with sizing options |

## JSON Format

The page builder consumes a single `IPageData` JSON:

```ts
interface IPageData {
  meta: { id: string; name: string; url: string; status: string };
  content: INode;   // The page content tree
  layout: INode;    // The page layout wrapper
  maxId: number;    // For generating unique IDs
  variables: Record<string, string>;  // Template variables
}

interface INode {
  id: number;
  name: string;         // Must match a registered component
  slot: string | null;  // Target slot in parent
  props: Record<string, unknown>;
  children: INode[];
  readonly?: boolean;
}
```

Props support template variables: `{{ PAGE_NAME }}` is replaced at render time.

## Development

**All commands run through Docker** (see [AGENTS.md](./AGENTS.md) for details):

```bash
# Start dev server with hot reload
docker compose -f docker/docker-compose.yml up dev

# Run tests
docker compose -f docker/docker-compose.yml run --rm test

# Run Playwright end-to-end tests
docker compose -f docker/docker-compose.yml run --rm e2e sh -lc "npm install && npm run test:e2e"

# Build the library
docker compose -f docker/docker-compose.yml run --rm build

# Generate API reference docs (TypeDoc)
docker compose -f docker/docker-compose.yml run --rm dev npm run docs:api

# Install a new dependency
docker compose -f docker/docker-compose.yml run --rm dev npm install <package>
```

The dev server starts a Vite playground at `http://localhost:5173` with a demo page for testing components.

### End-to-End Tests (Playwright)

E2E tests live in `tests/e2e/` and run against the playground via Playwright's `webServer` integration.

```bash
# Full E2E suite in Docker/CI
docker compose -f docker/docker-compose.yml run --rm e2e sh -lc "npm install && npm run test:e2e"

# Smoke workflow only (mode switch -> node selection -> prop edit -> save)
docker compose -f docker/docker-compose.yml run --rm e2e sh -lc "npm install && npm run test:e2e:smoke"
```

The `e2e` Docker image already includes Playwright browsers. If you need to (re)install browser binaries explicitly, run:

```bash
docker compose -f docker/docker-compose.yml run --rm e2e npm run e2e:install
```

## Documentation

All documentation lives in `docs/`:

| Document | Description |
|----------|-------------|
| **[Quick Start](./docs/quickstart.md)** | Get started: installation, setup, first render, edit mode, API |
| **[Backend integration](./docs/backend-integration.md)** | Expected routes, contracts (IPageData, IPageSavePayload), validation, media, security |
| **[Architecture](./docs/architecture/)** | Overview, JSON schema, component system, rendering pipeline, edit mode architecture |
| **[Features](./docs/features/)** | Read mode, edit mode, component registry, JSON format |
| **[Conventions](./docs/conventions/)** | Code style, git workflow |
| **[Roadmap](./docs/plans/roadmap.md)** | Phases and milestones |
| **[API reference](./docs/api/)** | TypeDoc output (public types and functions) |

To regenerate the API reference:

```bash
docker compose -f docker/docker-compose.yml run --rm dev npm run docs:api
```

## Releases

Releases are **tag-based**. Pushing a tag `release-vX.Y.Z` triggers the GitHub Actions workflow (quality gate + publish to npm).

### Creating a release

From the repo root, run the release script with the desired bump (`patch` is the default):

```bash
./scripts/release.sh [major|minor|patch]
# Examples:
./scripts/release.sh          # 0.1.0 → 0.1.1 (patch)
./scripts/release.sh minor    # 0.1.1 → 0.2.0
./scripts/release.sh major    # 0.2.0 → 1.0.0
```

The script bumps the version in `package.json`, commits, creates the tag `release-vX.Y.Z`, and pushes the branch and tag. The CI then runs the quality gate and publishes to npm. See [Git Workflow — Releases](./docs/conventions/git-workflow.md#releases) for details.

### Required repository secrets

- `NPM_TOKEN` (npm automation token with publish permission on `@improba/page-builder`)

### Local release verification and manual publish (Docker)

```bash
# Full release safety gate (typecheck + tests + build + types + docs)
docker compose -f docker/docker-compose.yml run --rm dev npm run release:prepare

# Inspect package contents before publish
docker compose -f docker/docker-compose.yml run --rm dev npm run release:dry-run

# Publish to npm manually (requires NPM_TOKEN in .env at project root)
source .env && docker compose -f docker/docker-compose.yml run --rm \
  -e NPM_TOKEN="$NPM_TOKEN" \
  dev sh -lc 'printf "//registry.npmjs.org/:_authToken=%s\n" "$NPM_TOKEN" > /tmp/.npmrc && npm publish --userconfig /tmp/.npmrc --access public'
```

See [Git Workflow — Releases](./docs/conventions/git-workflow.md#releases) for the full release process (tag-based CI and manual publish).

## API Reference

### Vue Plugin

```ts
app.use(PageBuilderPlugin, {
  components: [],        // Additional IComponentDefinition[]
  registerBuiltIn: true, // Register PbColumn, PbRow, etc.
  globalName: 'PageBuilder', // Global component name (false to skip)
});
```

### Registry Functions

| Function | Description |
|----------|-------------|
| `registerComponent(def)` | Register a single component |
| `registerComponents(defs)` | Register multiple components |
| `replaceComponent(def)` | Override an existing registration |
| `unregisterComponent(name)` | Remove a registration |
| `getComponent(name)` | Get definition by name |
| `resolveComponent(name)` | Get Vue component (throws if missing) |
| `getRegisteredComponents()` | Get all definitions |
| `getComponentsByCategory()` | Get definitions grouped by category |
| `hasComponent(name)` | Check if registered |
| `clearRegistry()` | Remove all (testing) |

### Tree Utilities

| Function | Description |
|----------|-------------|
| `findNodeById(root, id)` | Find node in tree |
| `findParent(root, childId)` | Find parent of node |
| `removeNode(root, id)` | Remove node from tree |
| `insertNode(root, parentId, node, index, slot)` | Insert node |
| `moveNode(root, nodeId, parentId, index, slot)` | Move node |
| `createNode(id, name, options)` | Create new node |
| `walkTree(root, visitor)` | Depth-first traversal |
| `cloneTree(node)` | Deep clone |
| `interpolateProps(props, vars)` | Replace template variables |

### Composables

| Composable | Purpose |
|------------|---------|
| `usePageBuilder(options)` | Core state management (mode, content, history) |
| `useEditor()` | Editor UI state (selection, drawers, viewport) |
| `useNodeTree(options)` | Tree mutation operations |
| `useDragDrop()` | Drag-and-drop interaction state |

## License

MIT
