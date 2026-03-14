# JSON Schema

This document provides a detailed breakdown of the JSON structures used by the page builder,
including interface definitions, slot distribution mechanics, variable interpolation rules,
and validation constraints.

## INode Interface

`INode` is the fundamental building block of the page tree. Each node represents a single
component instance.

```ts
interface INode {
  id: number;
  name: string;
  slot: string | null;
  props: Record<string, unknown>;
  children: INode[];
  readonly?: boolean;
}
```

### `id: number`

A unique integer identifier within the page. Used for:

- **Selection and hover** in the editor (identifying which node the user interacts with).
- **Drag-and-drop** (source and target identification).
- **Reconciliation** (Vue's `:key` binding for efficient re-rendering).
- **Tree lookups** (`findNodeById`, `findParent`, `removeNode`).

IDs are sequential integers. The `maxId` field on `IPageData` tracks the highest allocated
ID. When a new node is added, `maxId` is incremented and the new value becomes the node's ID.

### `name: string`

The component name, which must correspond to a key in the component registry. At render time,
`resolveComponent(name)` looks up the matching `IComponentDefinition` and returns the Vue
component to render.

If the name is not registered, `resolveComponent` throws an error listing available
components.

### `slot: string | null`

The target slot in the parent component where this node should be rendered. Standard values:

- `"default"` -- The default slot.
- `"header"`, `"footer"`, `"sidebar"`, etc. -- Named slots as defined by the parent's
  `IComponentDefinition.slots`.
- `null` -- Reserved for root nodes (`IPageData.content` and `IPageData.layout`).

### `props: Record<string, unknown>`

An arbitrary key-value map of props to pass to the Vue component. Values can be any JSON-
serializable type: strings, numbers, booleans, arrays, objects.

String values may contain `{{ VAR }}` template variable placeholders, which are resolved at
render time.

### `children: INode[]`

An ordered array of child nodes. Children are grouped by their `slot` field and rendered into
the corresponding named slot of the parent component. The order within each slot group is
preserved.

Leaf components (e.g., `PbText`, `PbImage`) have an empty `children` array.

### `readonly?: boolean`

When `true`, the node is protected from editing:

- Cannot be selected for property editing.
- Cannot be moved via drag-and-drop.
- Cannot be deleted or duplicated.

This is primarily used for structural layout nodes that should remain fixed.

## IPageData Interface

`IPageData` is the complete page payload returned by the backend API.

```ts
interface IPageData {
  meta: IPageMeta;
  content: INode;
  layout: INode;
  maxId: number;
  variables: Record<string, string>;
}
```

### `meta: IPageMeta`

Page-level metadata, not editable by the page builder:

```ts
interface IPageMeta {
  id: string;
  name: string;
  url: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt?: string;
  createdAt?: string;
}
```

- `id` -- Stable identifier for the page.
- `name` -- Human-readable page title.
- `url` -- URL path or slug.
- `status` -- Publication state. One of `draft`, `published`, or `archived`.
- `updatedAt`, `createdAt` -- ISO 8601 datetime strings. Optional.

### `content: INode`

The root node of the page's editable content tree. This is the tree users modify in edit
mode. Its `slot` should be `null`.

### `layout: INode`

The root node of the page's layout tree. The layout wraps the content and is typically marked
`readonly: true` to prevent user modification. Common layout nodes include an outer
`PbContainer` with a max-width constraint.

### `maxId: number`

The highest node ID currently in use across both the `content` and `layout` trees. The editor
calls `nextId()` which increments `maxId` and returns the new value.

This field must be persisted on save to avoid ID collisions when the page is edited again.

### `variables: Record<string, string>`

A dictionary of template variables available for interpolation. Keys are variable names
(UPPER_SNAKE_CASE by convention), values are the replacement strings.

## Slot Distribution Mechanism

The `NodeRenderer` component distributes child nodes into parent component slots using the
following algorithm:

1. **Group children by slot** -- Iterate over `node.children` and build a
   `Record<string, INode[]>` map, where each key is a slot name and each value is the ordered
   list of children targeting that slot.

2. **Render each group into a named template** -- For each entry in the map, produce a
   `<template #[slotName]>` block containing a recursive `<NodeRenderer>` for each child.

```
node.children = [
  { slot: "default", ... },  // -> #default
  { slot: "default", ... },  // -> #default
  { slot: "sidebar", ... },  // -> #sidebar
]

Grouped:
{
  "default": [child1, child2],
  "sidebar": [child3]
}
```

Children with a `slot` value of `null` are treated as `"default"`.

## Variable Interpolation

The `interpolateProps()` function processes node props before they reach the Vue component:

```ts
function interpolateProps(
  props: Record<string, unknown>,
  variables: Record<string, string>,
): Record<string, unknown>
```

**Algorithm:**

1. For each entry in `props`:
   - If the value is a `string`, apply regex replacement: `/\{\{\s*(\w+)\s*\}\}/g`
   - For each match, look up the captured variable name in `variables`.
   - If found, replace with the variable value.
   - If not found, leave the placeholder unchanged.
   - If the value is not a string, pass it through unmodified.
2. Return a new props object (original is not mutated).

## Validation Rules

### Node validation

| Rule                                | Severity | Description                                                |
| ----------------------------------- | -------- | ---------------------------------------------------------- |
| `id` must be a positive integer     | Error    | Non-positive or non-integer IDs break selection and keying. |
| `id` must be unique within the tree | Error    | Duplicate IDs cause rendering and selection bugs.           |
| `name` must be a registered component | Error  | Unregistered names cause a throw in `resolveComponent()`.   |
| `slot` must be `null` for root nodes | Warning | Root nodes should not target a parent slot.                 |
| `children` must be an array         | Error    | Missing or non-array `children` breaks recursion.           |
| `props` must be an object           | Error    | Non-object props cannot be spread onto a component.         |

### Page data validation

| Rule                                | Severity | Description                                                |
| ----------------------------------- | -------- | ---------------------------------------------------------- |
| `maxId` >= max ID in tree           | Error    | If `maxId` is too low, new nodes may get duplicate IDs.     |
| `meta.status` must be a valid enum  | Warning  | Unknown statuses are ignored but may cause backend issues.  |
| `variables` values must be strings  | Error    | Non-string values cannot be interpolated into string props. |
