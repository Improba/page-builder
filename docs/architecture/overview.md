# Architecture Overview

This document describes the high-level architecture of `@improba/page-builder`, a Vue 3
component library for building and rendering pages from a tree-based JSON format.

## Directory Structure

```
src/
  index.ts                     # Public API barrel export
  plugin.ts                    # Vue plugin (PageBuilderPlugin)

  types/
    index.ts                   # Type barrel export
    node.ts                    # INode, IPageData, IPageMeta, IPageSavePayload
    component.ts               # IComponentDefinition, ISlotDefinition, IPropDefinition
    editor.ts                  # IEditorState, ViewportPreset, IPageBuilderEvents

  core/
    registry.ts                # Component registry (reactive Map, register/resolve functions)
    tree.ts                    # Tree manipulation utilities (find, insert, remove, move, clone, interpolate)

  composables/
    use-page-builder.ts        # Core state management (content, layout, variables, snapshots)
    use-editor.ts              # Editor UI state (selection, drawers, history, viewport)
    use-node-tree.ts           # Tree mutation API (add, delete, move, duplicate, update props)
    use-drag-drop.ts           # Drag-and-drop interaction state

  components/
    PageBuilder.vue            # Root component — switches between read/edit mode
    reader/
      PageReader.vue           # Read mode wrapper
      NodeRenderer.vue         # Recursive node renderer
    editor/
      PageEditor.vue           # Edit mode root — wires composables, provides context
      EditorToolbar.vue        # Top toolbar (undo, redo, save, viewport)
      LeftDrawer.vue           # Component palette
      RightDrawer.vue          # Property editor
      EditorCanvas.vue         # Canvas viewport area

  built-in/
    index.ts                   # Built-in component barrel export
    PbColumn.vue               # Flex column layout
    PbRow.vue                  # Flex row layout
    PbText.vue                 # Text / HTML block
    PbImage.vue                # Image component
    PbSection.vue              # Full-width section wrapper
    PbContainer.vue            # Max-width container
```

## Entry Point

`src/index.ts` is the public API surface. It re-exports:

- **Vue components**: `PageBuilder`, `PageReader`, `PageEditor`, `NodeRenderer`
- **Registry functions**: `registerComponent`, `resolveComponent`, `getComponentsByCategory`, etc.
- **Tree utilities**: `cloneTree`, `findNodeById`, `insertNode`, `moveNode`, `interpolateProps`, etc.
- **Composables**: `usePageBuilder`, `useEditor`, `useNodeTree`, `useDragDrop`
- **Built-in components**: `PbColumn`, `PbRow`, `PbText`, `PbImage`, `PbSection`, `PbContainer`
- **All types**: Via `export type * from './types'`

## Vue Plugin

`src/plugin.ts` exports `PageBuilderPlugin`, a standard Vue plugin that:

1. Registers built-in components in the registry (unless `registerBuiltIn: false`).
2. Registers any custom components passed via `options.components`.
3. Registers the `<PageBuilder>` component globally (unless `globalName: false`).

## Separation of Concerns

The architecture is organized into four distinct layers:

### 1. Types (`types/`)

Pure TypeScript interfaces and type definitions. No runtime code, no Vue dependency (except
for `PropType` in the helper). These types define the contracts between all other layers.

### 2. Core Logic (`core/`)

Framework-agnostic pure functions for tree manipulation and component resolution.

- **`tree.ts`** -- Stateless functions that operate on `INode` objects: find, insert, remove,
  move, clone, walk, interpolate. These are pure (clone before mutating) and can run in any
  JavaScript environment, including server-side.
- **`registry.ts`** -- A singleton reactive `Map<string, IComponentDefinition>` with
  registration, lookup, and query functions. The reactive wrapper allows Vue components to
  respond to registry changes.

### 3. State Management (`composables/`)

Vue 3 Composition API composables that bridge core logic with reactive state:

- **`usePageBuilder`** -- Manages the root page data (content tree, layout, variables, maxId)
  and provides snapshot/restore for history.
- **`useEditor`** -- Manages editor-only UI state: selection, hover, drawer visibility,
  history stack, viewport.
- **`useNodeTree`** -- Wraps tree mutation functions with clone-on-write semantics and
  history integration.
- **`useDragDrop`** -- Tracks drag-and-drop interaction state (source, target, type).

### 4. UI (`components/`, `built-in/`)

Vue single-file components that consume composables and render the interface:

- **Read path**: `PageReader` -> `NodeRenderer` (recursive) -> resolved components.
- **Edit path**: `PageEditor` -> `EditorToolbar` + `LeftDrawer` + `EditorCanvas` +
  `RightDrawer`, all connected via `provide`/`inject`.
- **Built-in components**: Standard layout and content components (`PbRow`, `PbColumn`,
  `PbText`, `PbImage`, `PbSection`, `PbContainer`), each with co-located
  `builderOptions`.

## Build Output

The library builds to three artifacts via Vite in library mode:

| Output                    | Path                   | Description                     |
| ------------------------- | ---------------------- | ------------------------------- |
| ES module                 | `dist/index.js`        | Tree-shakeable ESM bundle       |
| CommonJS                  | `dist/index.cjs`       | Node.js / legacy bundler compat |
| Type declarations         | `dist/types/index.d.ts`| Generated by `vue-tsc`          |
| Styles                    | `dist/style.css`       | All component styles combined   |

The `package.json` `exports` map routes consumers to the correct format:

```json
{
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs",
    "types": "./dist/types/index.d.ts"
  },
  "./style.css": "./dist/style.css"
}
```

Vue is declared as a `peerDependency` (`^3.4.0`) and externalized from the build to avoid
bundling it.
