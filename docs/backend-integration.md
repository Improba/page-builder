# Backend integration

This document describes how to implement the backend for an application that uses `@improba/page-builder`. The library is **frontend only**: it does not define any routes or HTTP calls. Your backend must provide page persistence and, optionally, media handling.

## Backend role

- **Provide page data** — The frontend calls one or more routes to get the `IPageData` payload (read or edit mode).
- **Persist saves** — When the user saves (Save button or Ctrl/Cmd+S), the frontend emits a `@save` event with an `IPageSavePayload`. The host application must send this payload to the backend, and the backend must store it.
- **Optional: media** — Image/video/URL fields are currently entered as text (URL). If you want an "file upload" flow, your app must implement it and wire the MediaPicker `@upload` event (see Media section).

---

## Incoming contract: page data (GET)

The frontend expects a single payload type to display or edit a page: **`IPageData`**.

### Recommended route

| Method | Route (example)        | Description                    |
|--------|------------------------|--------------------------------|
| `GET`  | `/api/pages/:id`       | Returns a page by identifier.  |

The `:id` parameter can be the page's `meta.id` (string) or a technical identifier (e.g. UUID, slug). You define the convention.

### Expected response

- **Content-Type**: `application/json`
- **Body**: a JSON object conforming to `IPageData`.

TypeScript structure (reference):

```ts
interface IPageData {
  meta: IPageMeta;
  content: INode;
  layout: INode;
  maxId: number;
  variables: Record<string, string>;
}

interface IPageMeta {
  id: string;
  name: string;
  url: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt?: string;   // ISO 8601
  createdAt?: string;   // ISO 8601
}

interface INode {
  id: number;
  name: string;
  slot: string | null;
  props: Record<string, unknown>;
  children: INode[];
  readonly?: boolean;
}
```

- **meta**: Page metadata (identifier, name, URL, status, dates). Not edited by the editor; the backend manages it.
- **content**: Root of the editable content tree. The root node must have `slot: null`.
- **layout**: Root of the layout tree (wraps the content). Often a single node (e.g. `PbContainer`) with empty `children` or a content placeholder. May be marked `readonly: true`.
- **maxId**: Highest node `id` in the tree. **Required** so the editor can generate unique IDs when adding components. Must be consistent with node `id`s (≥ all tree `id`s).
- **variables**: Key/value map (string/string) injected into props at render time (replacement of `{{ VAR }}`). Not sent on save; the backend keeps and returns them on each GET.

### Example GET response

```json
{
  "meta": {
    "id": "page-001",
    "name": "Home",
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
        "props": { "gap": "24px" },
        "children": [
          {
            "id": 3,
            "name": "PbText",
            "slot": "default",
            "props": { "content": "<h1>Welcome</h1>", "tag": "div" },
            "children": []
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

### Frontend example

```ts
const pageId = 'page-001'; // or from route /pages/:id
const res = await fetch(`/api/pages/${pageId}`);
if (!res.ok) throw new Error('Page not found');
const pageData: IPageData = await res.json();
```

- In **read mode**: use `pageData` with `<PageBuilder :page-data="pageData" mode="read" />`.
- In **edit mode**: use the same `pageData` with `mode="edit"` and handle `@save` (see below).

---

## Outgoing contract: save (PUT / PATCH)

When the user saves, the component emits a **`save`** event with an **`IPageSavePayload`**. Only the editable parts are sent; `meta` and `variables` stay on the backend.

### Payload emitted by the frontend

```ts
interface IPageSavePayload {
  content: INode;   // Updated content tree
  layout: INode;    // Updated layout tree
  maxId: number;   // New maxId (persist for future node additions)
}
```

### Recommended route

| Method   | Route (example)     | Description                                          |
|----------|---------------------|------------------------------------------------------|
| `PUT`    | `/api/pages/:id`    | Replace the page (or only content/layout/maxId).   |
| `PATCH`  | `/api/pages/:id`    | Partial update (content, layout, maxId).           |

Common convention: **PUT** for "replace the whole page resource" (merging `meta` and `variables` yourself), **PATCH** for "update only content, layout, and maxId".

### Request body (example)

The frontend typically sends `IPageSavePayload` as JSON:

```json
{
  "content": { "id": 1, "name": "PbSection", "slot": null, "props": {}, "children": [ ... ] },
  "layout":  { "id": 100, "name": "PbContainer", "slot": null, "props": {}, "children": [] },
  "maxId": 105
}
```

### Expected backend behavior

1. **Identify the page** via `:id` (matching `meta.id` or your business key).
2. **Merge** received fields with existing data:
   - Replace `content`, `layout`, and `maxId` with payload values.
   - **Do not** overwrite `meta` or `variables` with the save payload (they are not included).
3. **Persist** (database, file, etc.).
4. **Update** `meta.updatedAt` if you use it.
5. Respond with **204 No Content** or **200 OK** (optionally with the full page in the body if your client reuses it).

### Frontend example

```vue
<PageBuilder
  :page-data="pageData"
  mode="edit"
  @save="onSave"
  @change="onChange"
/>
```

```ts
async function onSave(payload: IPageSavePayload) {
  const pageId = pageData.value?.meta.id;
  if (!pageId) return;
  const res = await fetch(`/api/pages/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Save failed');
  // Optional: update pageData with response if backend returns IPageData
}
```

---

## Backend validation

The library exports two validation functions you can reuse on the server if you run JavaScript/TypeScript:

- **`validatePageData(pageData: unknown): IValidationResult`** — Validates a full `IPageData` object (meta, content, layout, maxId, variables, node structure).
- **`validateNode(node: unknown, path?: string): IValidationResult`** — Validates a single node (useful for validating `content` or `layout` in isolation).

Recommendations:

1. **On GET**: Before sending a page to the client, validate (or at least verify) that the stored payload is valid `IPageData`, to avoid sending inconsistent data.
2. **On save (PUT/PATCH)**: Validate the received payload (e.g. `content` and `layout` with `validateNode`, and that `maxId` is an integer ≥ max of all `id`s present). On error, return **400 Bad Request** with a body describing the errors (the `errors` property of `IValidationResult` has the form `{ path, message }[]`).

Example error structure:

```json
{
  "error": "Validation failed",
  "details": [
    { "path": "content.children[0].id", "message": "Node id must be unique within the tree." }
  ]
}
```

If you do not use JavaScript/TypeScript on the backend, you must reimplement the same rules from the docs (see [JSON Schema](./architecture/json-schema.md), [JSON format](./features/json-format.md)) and from the `validatePageData` / `validateNode` implementations in the source.

---

## Business rules for the backend

When **building or updating** `IPageData` (on the backend):

1. **Unique IDs** — Each node must have a unique numeric `id` within the page. In practice: sequential integers, and `maxId` = maximum of all `id`s.
2. **Roots** — The `content` and `layout` root nodes must have `slot: null`.
3. **Default slot** — Children that go in the default slot must have `slot: "default"`.
4. **Children** — Leaf nodes must have `children: []` (empty array, not omitted).
5. **Variables** — Keys in UPPER_SNAKE_CASE by convention; values must be strings only.
6. **readonly** — Set `readonly: true` on layout nodes that the user must not edit (e.g. global container).

Details and examples: [JSON format](./features/json-format.md#backend-formatting-guidelines).

---

## Media (images, videos, URLs)

Currently, image/URL fields in built-in components (PbImage, PbVideo, etc.) are entered as **text URLs**. The **MediaPicker** component provides:

- A field to paste/enter a URL.
- An "Upload" button that **only emits an `upload` event** — the library does not call any API.

To offer a real upload flow:

1. In your application, intercept the `@upload` event (if you use a custom prop editor that wraps MediaPicker) or provide a mechanism (file picker, drag & drop) that calls **your** upload endpoint.
2. Your backend exposes for example:
   - **POST** `/api/media` (or `/api/pages/:id/media`): file upload, returns a public URL (or path) to store in the node props.
3. Once you have the URL, set it on the corresponding prop (e.g. `src`) of the node; the existing edit flow and save will send this value in `IPageSavePayload`.

No route or body format is imposed by the library for upload.

---

## Security

- **Frontend**: the library sanitizes HTML (richtext) and URLs (links, media, backgrounds) before display. Do not disable these checks in production.
- **Backend**: you must also validate and, if needed, sanitize received data (save). In particular:
  - Validate structure (unique IDs, allowed component names, prop types).
  - For HTML in props (e.g. PbText `content`), apply a safe content policy (allowlist of tags/attributes) or store plain text and let the frontend apply safe rendering.
  - Validate URLs (allowed schemes, no javascript:, etc.) for image/video/link fields.

---

## HTTP codes and errors

| Code        | Recommended use |
|------------|-----------------|
| **200 OK** | GET page: return `IPageData` body. Optionally PUT/PATCH if you return the updated page. |
| **204 No Content** | PUT/PATCH save success with no body. |
| **400 Bad Request** | Invalid save payload (validation failed). Body: message + details (e.g. validation error list). |
| **404 Not Found** | Page does not exist for GET or PUT/PATCH on unknown `:id`. |
| **409 Conflict** | Optional: version conflict if you use optimistic versioning. |
| **500 Internal Server Error** | Server error (avoid exposing sensitive details to the client). |

---

## Summary of expected routes

The library **does not impose** any URL. Here is a summary of the routes your backend should expose **at minimum** for full integration:

| Method | Route (example)   | Request body     | Success response   |
|--------|-------------------|------------------|--------------------|
| **GET**  | `/api/pages/:id`   | —                | `200` + `IPageData` (JSON) |
| **PUT** or **PATCH** | `/api/pages/:id` | `IPageSavePayload` (JSON) | `200` + optional body or `204` |

Optional (media):

| Method | Route (example)   | Description |
|--------|------------------|-------------|
| **POST** | `/api/media` or `/api/pages/:id/media` | File upload; returns URL to store in props. |

---

## References

- **[JSON format](./features/json-format.md)** — Detail of `INode`, `IPageData`, variables, save payload.
- **[JSON Schema (architecture)](./architecture/json-schema.md)** — Constraints and best practices on structures.
- **[Quick Start](./quickstart.md)** — Example of loading a page from an API and handling `@save`.
- **Types and validation**: exported from `@improba/page-builder` (`IPageData`, `IPageSavePayload`, `validatePageData`, `validateNode`). See the [API reference](./api/README.md).
