# Read Mode

Read mode is the default rendering mode of the page builder. It produces a pure, read-only
representation of a page tree with no editor UI, no selection overlays, and no drag-drop
handlers. It is designed for SSR-compatible, production-facing page display.

## Overview

When the `<PageBuilder>` component receives `mode="read"` (the default), it delegates to
`<PageReader>`. `PageReader` first builds a read root (`readerRoot`) and then renders it through
the recursive `<NodeRenderer>` component inside an `<ErrorBoundary>`.

```vue
<PageBuilder :page-data="pageData" mode="read" />
```

The resulting DOM is a composition of registered Vue components inside a single
`.ipb-page-reader` container.

## Layout Wrapping in Read Mode

`PageReader` wraps `content` with `layout` when `pageData.layout` exists:

1. **Legacy fallback** -- If `pageData.layout` is missing, read mode renders `pageData.content`
   directly (backward compatibility for legacy payloads).
2. **Content root normalization** -- The content root is copied, and its slot defaults to
   `"default"` only when it is `null`.
3. **Layout composition** -- The final root is a copy of `pageData.layout` with
   `children: [...layout.children, contentRoot]`.

This means the content tree is rendered as a child of the layout tree in read mode. Existing
layout children are preserved in order, and the content root is appended last.

If the content root already targets a named slot (for example `"content"`), that slot is
preserved and used when rendering.

## NodeRenderer

`NodeRenderer` is the core recursive component that turns the JSON tree into a Vue component
tree. For each `INode`, it:

1. **Resolves the component** -- Calls `resolveComponent(node.name)` to look up the Vue
   component from the registry.
2. **Interpolates props** -- Passes `node.props` through `interpolateProps()` to replace
   template variable placeholders with actual values.
3. **Groups children by slot** -- Partitions `node.children` by their `slot` field to produce
   a `Record<string, INode[]>` map.
4. **Renders into named slots** -- For each slot group, renders a `<template #[slotName]>`
   containing a recursive `<NodeRenderer>` for every child in that group.

```
INode
  -> resolveComponent(node.name)   -> Vue component
  -> interpolateProps(node.props)  -> resolved props
  -> group children by slot        -> { default: [...], sidebar: [...] }
  -> render <component :is="..." v-bind="...">
       <template #default> ... </template>
       <template #sidebar> ... </template>
     </component>
```

## SSR Compatibility

Read mode is fully SSR-compatible:

- `NodeRenderer` uses only `computed` properties -- no lifecycle hooks that depend on the DOM.
- `resolveComponent()` and `interpolateProps()` are pure, synchronous functions.
- No `onMounted`, `onUpdated`, or any browser-only API is used in the rendering path.
- `PageReader` root composition (`layout + content`) is synchronous and does not rely on browser
  globals.
- The component tree can be rendered server-side with `@vue/server-renderer` or via Nuxt's
  SSR pipeline.

SSR behavior is validated in `tests/ssr/render.test.ts` with a Node-only Vitest environment:

- Renders with `createSSRApp()` + `renderToString()` in `mode: "read"`.
- Asserts `window` and `document` are not present.
- Verifies variable interpolation and recursive slot rendering in server output.

To use in a Nuxt context:

```ts
import { PageReader } from '@improba/page-builder';
import '@improba/page-builder/style.css';
```

## Template Variable Interpolation

String props in nodes can contain `{{ VAR }}` placeholders. These are resolved at render time
against the `IPageData.variables` dictionary.

Given a node:

```json
{
  "id": 5,
  "name": "PbText",
  "slot": "default",
  "props": { "content": "Welcome, {{ USER_NAME }}!" },
  "children": []
}
```

And variables:

```json
{
  "USER_NAME": "Alice"
}
```

The rendered output will be `"Welcome, Alice!"`.

**Rules:**

- Only string-valued props are interpolated. Non-string props are passed through as-is.
- If a variable is not found, the placeholder is left intact: `{{ UNKNOWN }}` remains in the
  output.
- Whitespace inside braces is optional: `{{VAR}}`, `{{ VAR }}`, and `{{  VAR  }}` all work.

## Slot-Based Child Distribution

Children are distributed across the parent component's named slots based on each child's
`slot` field. This mirrors Vue's native named slot system.

A parent component declares the slots it accepts in its `IComponentDefinition.slots` array.
Children whose `slot` value matches are rendered into that slot.

Example tree:

```json
{
  "id": 1,
  "name": "PbSection",
  "slot": null,
  "props": {},
  "children": [
    { "id": 2, "name": "PbText", "slot": "default", "props": { "content": "Main content" }, "children": [] },
    { "id": 3, "name": "PbText", "slot": "sidebar", "props": { "content": "Side content" }, "children": [] }
  ]
}
```

In this example, the `PbSection` component receives two slot fills: one in `default` and one
in `sidebar`.

## No Edit UI

Read mode renders zero editor-related elements:

- No selection overlays or hover highlights
- No drag-drop handlers or drop indicators
- No toolbars, drawers, or property editors
- No history tracking

This makes the read mode output lightweight and suitable for public-facing pages.

## ErrorBoundary Behavior

`PageReader` wraps the recursive tree in `ErrorBoundary` to prevent broken node trees from
crashing the whole read-mode render.

- If rendering succeeds, `ErrorBoundary` renders only its slot content (no extra success wrapper).
- If a descendant throws (for example, an unregistered component), it switches to a safe fallback
  block (`.ipb-error-boundary`, `role="alert"`).
- Default fallback message:
  `"Something went wrong while rendering this section."`
- Optional error details are shown only when both conditions are true:
  `import.meta.env.DEV === true` and `showDetailsInDev === true`.

Behavior is covered by `tests/components/ErrorBoundary.test.ts` and
`tests/components/PageReader.test.ts`.
