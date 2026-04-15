# Edit Mode

Edit mode provides a full WYSIWYG editing experience for building and modifying pages. It
exposes a three-panel layout with a toolbar, component palette, canvas, and property editor.

## Overview

When the `<PageBuilder>` component receives `mode="edit"`, it delegates to `<PageEditor>`,
which assembles the full editor UI:

```vue
<PageBuilder :page-data="pageData" mode="edit" @save="onSave" @change="onChange" />
```

The editor is composed of four major regions:

```
+----------------------------------------------------------+
|                    EditorToolbar                          |
+----------+-------------------------------+---------------+
|          |                               |               |
|  Left    |       EditorCanvas            |    Right      |
|  Drawer  |       (iframe viewport)       |    Drawer     |
|          |                               |               |
| (palette)|                               | (properties)  |
|          |                               |               |
+----------+-------------------------------+---------------+
```

## Editor Toolbar

The `EditorToolbar` sits at the top and provides global editing controls:

- **Undo / Redo** -- Navigate through the history stack. Buttons are disabled when the
  respective action is unavailable.
- **Save** -- Emits the `save` event with the current content tree and `maxId`. A visual
  indicator shows when unsaved changes exist (dirty state).
- **Viewport switching** -- Toggle between `desktop` (1440px), `tablet` (768px), and
  `mobile` (375px) presets. The canvas iframe resizes accordingly.

## Left Drawer (Component Palette)

The left drawer displays all registered, non-hidden components grouped by category:

- **layout** -- PbRow, PbColumn, PbSection, PbContainer
- **content** -- PbText
- **media** -- PbImage
- **custom** -- Any user-registered components

Each entry shows the component's `label`, `icon`, and `description`. Icons can be emoji/unicode
characters (e.g. `'T'`, `'🖼'`) or [Lucide](https://lucide.dev/) icon names using the
`i-lucide-*` format (e.g. `'i-lucide-lock'`). Lucide icons are rendered as inline SVGs.
Components are dragged from the palette onto the canvas to add them to the tree.

The drawer can be toggled open/closed via `toggleLeftDrawer()`.

## Editor Canvas

The central canvas area renders the page content for visual editing. Key behaviors:

- **Node selection** -- Clicking a rendered component selects it, highlighting it with an
  overlay and opening the right drawer for property editing.
- **Node hovering** -- Hovering over a component shows a subtle outline to indicate which
  element is under the cursor.
- **Viewport preview** -- The canvas respects the active viewport preset, scaling the content
  to simulate different screen sizes.
- **Drop targets** -- During drag operations, the canvas shows drop indicators between and
  inside components to guide placement.

## Right Drawer (Property Editor)

The right drawer opens when a node is selected and provides:

- **Property editing** -- Each of the selected component's `editableProps` is rendered as a
  typed form widget. Supported widget types:
  - `text` -- Single-line text input
  - `textarea` -- Multi-line text input
  - `richtext` -- Rich text / HTML editor
  - `number` -- Numeric input with optional min/max
  - `boolean` -- Toggle switch
  - `select` -- Dropdown with predefined options
  - `color` -- Color picker
  - `image` -- Image URL picker
  - `url` -- URL input with validation
  - `json` -- Raw JSON editor
- **Delete** -- Remove the selected node from the tree.
- **Duplicate** -- Clone the selected node (with new IDs) and insert it after the original.
- **Node info** -- Displays the component name, ID, and slot assignment.

Property changes call `nodeTree.updateNodeProps()`, which clones the tree, applies the change,
and pushes a history snapshot.

## Drag and Drop

The editor supports two drag-and-drop flows:

### Adding new components

1. User drags a component entry from the left drawer palette.
2. `useDragDrop().startDragNew(componentName)` is called with the component name.
3. As the user hovers over the canvas, `updateDropTarget()` tracks the target parent, index,
   and slot.
4. On drop, the editor reads the final `DragState` and calls `nodeTree.addNode()` with the
   component's `defaultProps`.

### Moving existing components

1. User drags an existing node in the canvas.
2. `useDragDrop().startDragExisting(nodeId)` is called.
3. Drop target tracking works the same way.
4. On drop, `nodeTree.moveNodeTo()` removes the node from its current position and inserts it
   at the new location.

Both flows produce a history entry for undo/redo support.

## History (Undo/Redo)

Every tree mutation generates a snapshot via `usePageBuilder().getSnapshot()`, which
serializes the content tree, layout tree, and `maxId` to JSON. Snapshots are pushed onto a
linear history stack managed by `useEditor()`.

- **Undo** decrements `historyIndex` and restores the previous snapshot.
- **Redo** increments `historyIndex` and restores the next snapshot.
- When a new mutation occurs after an undo, the forward history is discarded (standard
  branching behavior).

History entries include a `label` (e.g., "Add PbText", "Move node", "Update props") and a
`timestamp` for potential display in a history panel.

## Events

The editor emits two events to the parent:

| Event    | Payload                                     | Trigger           |
| -------- | ------------------------------------------- | ----------------- |
| `save`   | `{ content: INode, maxId: number }`         | Save button / Ctrl+S |
| `change` | `INode` (the updated content tree)          | Any tree mutation  |

## State Management

All editor state is managed through four composables, wired together in `PageEditor.vue` and
distributed to child components via Vue's `provide`/`inject`:

| Key            | Composable        | Purpose                              |
| -------------- | ----------------- | ------------------------------------ |
| `pageBuilder`  | `usePageBuilder`  | Core data: content, layout, variables |
| `editor`       | `useEditor`       | UI state: selection, drawers, history |
| `nodeTree`     | `useNodeTree`     | Tree mutations: add, remove, move     |
| `dragDrop`     | `useDragDrop`     | Drag-and-drop interaction state       |

See [Edit Mode Architecture](../architecture/edit-mode-architecture.md) for detailed
composable documentation.
