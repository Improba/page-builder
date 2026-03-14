# JSON Format

The page builder uses a tree-based JSON format to represent pages. This format is the single
source of truth exchanged between the backend API and the frontend rendering/editing layer.

## INode -- Tree Node

Every element on a page is an `INode`. Nodes form a recursive tree where each node maps to a
registered component and can contain children distributed across named slots.

```ts
interface INode {
  id: number;                          // Unique identifier within the tree
  name: string;                        // Component name (registry key)
  slot: string | null;                 // Target slot in the parent (null for root)
  props: Record<string, unknown>;      // Props passed to the component
  children: INode[];                   // Child nodes
  readonly?: boolean;                  // If true, locked from editing
}
```

### Field details

| Field      | Type                       | Required | Description                                                       |
| ---------- | -------------------------- | -------- | ----------------------------------------------------------------- |
| `id`       | `number`                   | Yes      | Unique within the page. Used for selection, drag-drop, and diffing. |
| `name`     | `string`                   | Yes      | Must match a registered component name.                            |
| `slot`     | `string \| null`           | Yes      | The named slot in the parent component to render into. `null` for the root node. |
| `props`    | `Record<string, unknown>`  | Yes      | Arbitrary key-value pairs passed as Vue props. May contain `{{ VAR }}` placeholders. |
| `children` | `INode[]`                  | Yes      | Ordered list of child nodes. Can be empty.                         |
| `readonly` | `boolean`                  | No       | When `true`, the node cannot be moved, edited, or deleted in edit mode. |

## IPageData -- Page Envelope

The full JSON payload delivered by the backend wraps the node tree in an `IPageData` envelope:

```ts
interface IPageData {
  meta: IPageMeta;                     // Page metadata
  content: INode;                      // Root node of the page content tree
  layout: INode;                       // Root node of the layout tree (wraps content)
  maxId: number;                       // Highest node ID in use
  variables: Record<string, string>;   // Template variables for interpolation
}

interface IPageMeta {
  id: string;                          // Page identifier
  name: string;                        // Human-readable page name
  url: string;                         // Page URL / slug
  status: 'draft' | 'published' | 'archived';
  updatedAt?: string;                  // ISO 8601 timestamp
  createdAt?: string;                  // ISO 8601 timestamp
}
```

### Field details

| Field       | Type                       | Description                                                    |
| ----------- | -------------------------- | -------------------------------------------------------------- |
| `meta`      | `IPageMeta`                | Page identification and status. Not editable by the builder.    |
| `content`   | `INode`                    | The root of the user-editable content tree.                     |
| `layout`    | `INode`                    | The root of the layout tree. Typically wraps `content`.         |
| `maxId`     | `number`                   | Tracked to generate unique IDs when adding nodes. Must be saved back. |
| `variables` | `Record<string, string>`   | Key-value pairs injected into `{{ VAR }}` placeholders at render time. |

## Template Variables

String props can reference variables using `{{ VAR }}` syntax. At render time, the
`interpolateProps()` function replaces each occurrence with the matching value from
`IPageData.variables`.

**Syntax rules:**

- Pattern: `{{ VARIABLE_NAME }}`
- Variable names are word characters (`\w+`): letters, digits, underscores.
- Whitespace inside braces is flexible: `{{VAR}}`, `{{ VAR }}`, `{{  VAR  }}` all resolve.
- Non-string props are not interpolated.
- Missing variables are left as-is in the output.

**Example:**

```json
{
  "variables": {
    "COMPANY_NAME": "Improba",
    "YEAR": "2026"
  }
}
```

A prop value of `"Copyright {{ COMPANY_NAME }} {{ YEAR }}"` renders as
`"Copyright Improba 2026"`.

## Example: Complete Page Payload

```json
{
  "meta": {
    "id": "page-001",
    "name": "Home Page",
    "url": "/",
    "status": "published",
    "updatedAt": "2026-03-10T14:30:00Z",
    "createdAt": "2026-01-15T09:00:00Z"
  },
  "content": {
    "id": 1,
    "name": "PbSection",
    "slot": null,
    "props": { "padding": "32px" },
    "children": [
      {
        "id": 2,
        "name": "PbRow",
        "slot": "default",
        "props": { "gap": "24px", "justify": "center" },
        "children": [
          {
            "id": 3,
            "name": "PbColumn",
            "slot": "default",
            "props": { "width": "60%" },
            "children": [
              {
                "id": 4,
                "name": "PbText",
                "slot": "default",
                "props": {
                  "content": "<h1>Welcome to {{ COMPANY_NAME }}</h1>",
                  "tag": "div"
                },
                "children": []
              }
            ]
          },
          {
            "id": 5,
            "name": "PbColumn",
            "slot": "default",
            "props": { "width": "40%" },
            "children": [
              {
                "id": 6,
                "name": "PbImage",
                "slot": "default",
                "props": { "src": "/images/hero.jpg", "alt": "Hero image" },
                "children": []
              }
            ]
          }
        ]
      }
    ]
  },
  "layout": {
    "id": 100,
    "name": "PbContainer",
    "slot": null,
    "props": { "maxWidth": "1200px" },
    "children": [],
    "readonly": true
  },
  "maxId": 100,
  "variables": {
    "COMPANY_NAME": "Improba"
  }
}
```

## Save Payload

When the editor saves, only the mutable parts are sent back to the backend:

```ts
interface IPageSavePayload {
  content: INode;
  layout: INode;
  maxId: number;
}
```

The backend should merge this with the existing `meta` and `variables` fields. The `maxId`
must be persisted so that future node additions produce unique IDs.

## Backend Formatting Guidelines

When constructing `IPageData` on the backend:

1. **Assign unique IDs** -- Every node must have a unique `id` within the tree. Use
   sequential integers starting from 1.
2. **Track maxId** -- Set `maxId` to the highest `id` in the tree. The frontend increments
   this counter when adding nodes.
3. **Set the root slot to null** -- The root `content` and `layout` nodes should have
   `slot: null`.
4. **Default slot name** -- Children that target the default slot should use
   `"slot": "default"`.
5. **Empty children** -- Leaf nodes (no children) should have `"children": []`, not omit the
   field.
6. **Variables** -- Populate the `variables` map with any dynamic values the page needs.
   Variable names should be UPPER_SNAKE_CASE by convention.
7. **Readonly nodes** -- Set `readonly: true` on layout-level nodes that users should not be
   able to modify (e.g., the outer container).
