# Rendering Pipeline

This document describes how the page builder transforms a JSON tree (`INode`) into rendered
Vue components, covering the recursive rendering algorithm, slot distribution, props
interpolation, and the differences between read mode and edit mode rendering.

## Pipeline Overview

```
IPageData
  |
  v
PageReader / PageEditor
  |
  v
NodeRenderer (recursive)
  |
  +-- resolveComponent(node.name)    -> Vue Component
  +-- interpolateProps(node.props)   -> resolved props
  +-- groupChildrenBySlot(children)  -> { slotName: INode[] }
  |
  v
<component :is="resolved" v-bind="props">
  <template #slotA>
    <NodeRenderer :node="childA1" />
    <NodeRenderer :node="childA2" />
  </template>
  <template #slotB>
    <NodeRenderer :node="childB1" />
  </template>
</component>
```

For read mode specifically, `PageReader` first computes a root node (`readerRoot`) by composing
`layout` + `content`, then renders that root through `ErrorBoundary` + `NodeRenderer`.

## NodeRenderer Recursion

`NodeRenderer` is a self-referencing Vue component. For a given `INode`, it:

1. **Resolves the component** via `resolveComponent(node.name)`. This is a computed property,
   so it updates reactively if the registry changes.

2. **Interpolates props** via `interpolateProps(node.props, variables)`. This is also
   computed, reacting to both prop and variable changes.

3. **Groups children by slot** via a computed that builds `Record<string, INode[]>` from
   `node.children`, keyed by each child's `slot` field (falling back to `"default"` for
   `null`).

4. **Renders** using Vue's dynamic `<component :is>` with `v-bind` for props and
   `<template #[slotName]>` for each slot group. Each child is rendered by a nested
   `<NodeRenderer>`, creating the recursion.

### Recursion termination

The recursion terminates naturally when a node has an empty `children` array. In that case,
no slot templates are generated and the component renders without children.

## Slot Grouping Algorithm

```ts
const slotGroups = computed(() => {
  const groups: Record<string, INode[]> = {};
  for (const child of node.children) {
    const slotName = child.slot ?? 'default';
    if (!groups[slotName]) groups[slotName] = [];
    groups[slotName].push(child);
  }
  return groups;
});
```

Key properties:

- **Order preservation** -- Children targeting the same slot maintain their original order
  from the `children` array.
- **Null fallback** -- A `null` slot is treated as `"default"`.
- **Dynamic slots** -- The grouping is computed, so adding or removing children reactively
  updates the slot distribution.
- **Unmapped slots** -- If a child targets a slot the parent component does not define, Vue
  silently ignores it (the content is not rendered). This is consistent with Vue's native
  slot behavior.

## Props Interpolation

The `interpolateProps()` function is applied to every node's props before binding:

```ts
function interpolateProps(
  props: Record<string, unknown>,
  variables: Record<string, string>,
): Record<string, unknown>
```

The function iterates over all prop entries:

- **String values** are processed with a regex replacement:
  `/\{\{\s*(\w+)\s*\}\}/g` matches `{{ VAR }}` patterns. Each match is looked up in the
  `variables` map. Found variables are replaced; missing ones are left as-is.
- **Non-string values** (numbers, booleans, objects, arrays) pass through unchanged.

The function returns a new object; the original `props` are never mutated.

## Component Resolution

`resolveComponent(name)` performs a synchronous lookup in the reactive registry:

```ts
function resolveComponent(name: string): Component {
  const def = _registry.get(name);
  if (!def) {
    throw new Error(`Component "${name}" is not registered. Available: ...`);
  }
  return def.component;
}
```

The error message includes all registered component names, which aids debugging when a
backend delivers a node with a typo or an unregistered component name.

Since the registry is `reactive`, the computed property in `NodeRenderer` that calls
`resolveComponent` will re-evaluate if a component is registered or replaced at runtime.

## Read-Mode Root Composition (Layout + Content)

Before recursion starts in read mode, `PageReader` computes `readerRoot`:

```ts
const readerRoot = computed<INode>(() => {
  if (!pageData.layout) return pageData.content; // legacy payload fallback

  const contentRoot: INode = {
    ...pageData.content,
    slot: pageData.content.slot ?? 'default',
  };

  return {
    ...pageData.layout,
    children: [...pageData.layout.children, contentRoot],
  };
});
```

Important implications:

- **Layout wraps content** -- The layout tree is the top-level rendered root in read mode.
- **Legacy compatibility** -- Missing `layout` falls back to content-only rendering.
- **Slot preservation** -- Existing content slot values are preserved; only `null` becomes
  `"default"`.
- **Non-mutating** -- `pageData.content` and `pageData.layout` are copied, not mutated.

## Read Mode vs Edit Mode Rendering

### Read mode

In read mode, `PageReader` renders `readerRoot` (layout-wrapped content) through
`ErrorBoundary` and then `NodeRenderer`:

```
PageReader
  -> readerRoot = compose(layout, content)
  -> ErrorBoundary
       -> NodeRenderer(readerRoot, variables)
         -> component tree, no editor overlays
```

Read mode rendering has:

- No selection or hover state
- No overlay elements (selection borders, hover highlights)
- No drag-and-drop event handlers
- No `provide`/`inject` of editor context
- No editor-side wrappers around rendered nodes

The success path produces the production component tree with layout wrapping. If a descendant
throws during render, `ErrorBoundary` switches to fallback UI (`.ipb-error-boundary`) instead of
crashing the full read-mode tree.

### Edit mode

In edit mode, `PageEditor` also renders the tree through `NodeRenderer`, but within the
`EditorCanvas` context:

```
PageEditor
  -> provide(pageBuilder, editor, nodeTree, dragDrop)
  -> EditorToolbar
  -> LeftDrawer
  -> EditorCanvas
       -> NodeRenderer(content, variables)
       -> selection/hover overlays
       -> drop indicators
  -> RightDrawer
```

Edit mode rendering adds:

- **Selection overlay** -- A visual border/highlight on the selected node, driven by
  `editor.selectedNodeId`.
- **Hover overlay** -- A subtle outline on the hovered node, driven by
  `editor.hoveredNodeId`.
- **Click handlers** -- Clicking a component in the canvas triggers `editor.selectNode(id)`.
- **Drop zones** -- During drag operations, visual indicators show valid drop positions.
- **Canvas scaling** -- The content viewport can be scaled to simulate different screen sizes.

The underlying `NodeRenderer` recursion and component resolution are identical in both modes.
The difference lies in the surrounding context and event handling.

## SSR Compatibility Notes

SSR read-mode coverage is implemented in `tests/ssr/render.test.ts` (Node environment):

- Uses `createSSRApp(PageBuilder, { mode: 'read' })` + `renderToString()`.
- Verifies rendering works without browser globals (`window`/`document` undefined).
- Verifies interpolation and recursive slot rendering across nested nodes.

This aligns with the runtime pipeline: root composition and recursion are synchronous and rely on
Vue reactivity/computed state only, with no browser-only APIs.

## Future: Iframe Isolation

A planned enhancement is to render the edit mode canvas content inside an iframe. This would
provide:

- **Style isolation** -- Page styles cannot leak into the editor UI and vice versa.
- **Viewport accuracy** -- The iframe can be resized to exact device dimensions without CSS
  transforms.
- **Script safety** -- Custom component scripts run in an isolated context.

The rendering pipeline itself (NodeRenderer recursion) would remain unchanged. The iframe
boundary would be handled at the `EditorCanvas` level, mounting a separate Vue app inside the
iframe that renders the same `NodeRenderer` tree.
