# Edit Mode Architecture

The edit mode is composed of four composables that manage state, tree mutations, and UI
interactions. These composables are instantiated in `PageEditor.vue` and distributed to child
components via Vue's `provide`/`inject` mechanism.

## Composable Overview

```
PageEditor.vue
  |
  +-- usePageBuilder({ initialData, mode: 'edit' })   -> pb
  +-- useEditor()                                      -> editor
  +-- useNodeTree({ content, nextId, onUpdate, onSnapshot })  -> nodeTree
  +-- useDragDrop()                                    -> dragDrop
  |
  +-- provide('pageBuilder', pb)
  +-- provide('editor', editor)
  +-- provide('nodeTree', nodeTree)
  +-- provide('dragDrop', dragDrop)
```

Child components (`EditorToolbar`, `LeftDrawer`, `RightDrawer`, `EditorCanvas`) inject
whichever composables they need.

## usePageBuilder

**File:** `src/composables/use-page-builder.ts`

The root state composable. Manages the page's mutable data and provides snapshot/restore for
the history system.

### Options

```ts
interface UsePageBuilderOptions {
  initialData: IPageData;
  mode?: PageBuilderMode;       // default: 'read'
}
```

### Returned state

| Ref / Function      | Type                           | Description                                      |
| -------------------- | ------------------------------ | ------------------------------------------------ |
| `mode`               | `Ref<PageBuilderMode>`         | Current mode (`'read'` or `'edit'`).              |
| `pageData`           | `Ref<IPageData>`               | The full page data (deep clone of input).         |
| `content`            | `Ref<INode>`                   | The content tree root. Mutable in edit mode.      |
| `layout`             | `Ref<INode>`                   | The layout tree root.                             |
| `maxId`              | `Ref<number>`                  | Current max node ID.                              |
| `variables`          | `Ref<Record<string, string>>`  | Template variables.                               |
| `isDirty`            | `Ref<boolean>`                 | True if changes have been made since load/reset.  |
| `setMode(mode)`      | Function                       | Switch between read and edit mode.                |
| `updateContent(node)`| Function                       | Replace the content tree and update maxId.        |
| `nextId()`           | Function -> `number`           | Increment maxId and return the new value.         |
| `getSnapshot()`      | Function -> `string`           | Serialize content + layout + maxId to JSON.       |
| `restoreSnapshot(s)` | Function                       | Deserialize and restore a snapshot.               |
| `reset()`            | Function                       | Restore to the initial data state.                |

### Snapshot format

`getSnapshot()` produces:

```json
{
  "content": { ... },
  "layout": { ... },
  "maxId": 42
}
```

This is the unit of undo/redo -- each history entry stores one such snapshot.

## useEditor

**File:** `src/composables/use-editor.ts`

Manages editor-specific UI state: selection, hover, drawer visibility, history, and viewport.

### State (reactive)

```ts
interface IEditorState {
  selectedNodeId: number | null;
  hoveredNodeId: number | null;
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
  draggedNode: INode | null;
  history: IEditorHistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  canvasScale: number;
  viewport: ViewportPreset;
}
```

All fields are exposed as individual refs via `toRefs(state)`.

### Key functions

| Function                | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `selectNode(id)`        | Set the selected node. Opens the right drawer if `id` is not null. |
| `hoverNode(id)`         | Set the hovered node.                                            |
| `toggleLeftDrawer()`    | Toggle the component palette visibility.                         |
| `toggleRightDrawer()`   | Toggle the property editor visibility.                           |
| `setViewport(preset)`   | Change the viewport preset (`desktop`, `tablet`, `mobile`, `custom`). |
| `pushHistory(label, s)` | Push a snapshot onto the history stack. Truncates forward history. |
| `undo()`                | Move back in history. Returns the snapshot to restore, or `undefined`. |
| `redo()`                | Move forward in history. Returns the snapshot to restore, or `undefined`. |
| `startDrag(node)`       | Set the dragged node (legacy; see `useDragDrop` for full drag state). |
| `endDrag()`             | Clear the dragged node.                                          |

### Computed

| Computed   | Description                                   |
| ---------- | --------------------------------------------- |
| `canUndo`  | `true` if `historyIndex > 0`.                 |
| `canRedo`  | `true` if `historyIndex < history.length - 1`.|

## useNodeTree

**File:** `src/composables/use-node-tree.ts`

Provides high-level tree mutation operations with clone-on-write semantics and automatic
history integration.

### Options

```ts
interface UseNodeTreeOptions {
  content: Ref<INode>;
  nextId: () => number;
  onUpdate: (newContent: INode) => void;
  onSnapshot?: (label: string) => void;
}
```

- `content` -- Reference to the current content tree (from `usePageBuilder`).
- `nextId` -- ID generator (from `usePageBuilder`).
- `onUpdate` -- Callback invoked with the new tree after each mutation.
- `onSnapshot` -- Optional callback to push a history entry (wired to `useEditor.pushHistory`).

### Mutation pattern

All mutations follow the same internal pattern:

```ts
function _mutate(label: string, mutator: (tree: INode) => void) {
  const cloned = cloneTree(content.value);  // deep clone
  mutator(cloned);                           // apply mutation to the clone
  onUpdate(cloned);                          // replace the tree
  onSnapshot?.(label);                       // record history
}
```

This ensures:

1. **Immutability** -- The original tree is never mutated. Snapshots in the history stack
   remain valid references to past states.
2. **Atomicity** -- Each mutation is a single clone-mutate-replace cycle.
3. **History** -- Every mutation automatically creates a history entry.

### Functions

| Function                               | Description                                           |
| -------------------------------------- | ----------------------------------------------------- |
| `addNode(parentId, name, index, slot, defaultProps)` | Create a new node and insert it into the tree. Returns the new ID. |
| `deleteNode(nodeId)`                   | Remove a node from the tree.                           |
| `moveNodeTo(nodeId, newParentId, index, slot)` | Move a node to a new position in the tree.      |
| `updateNodeProps(nodeId, props)`       | Merge new prop values into a node's existing props.    |
| `duplicateNode(nodeId)`                | Clone a node (with recursively new IDs) and insert after the original. |

## useDragDrop

**File:** `src/composables/use-drag-drop.ts`

Manages the state of drag-and-drop interactions, supporting both dragging new components from
the palette and reordering existing nodes.

### State

```ts
interface DragState {
  isDragging: boolean;
  sourceNodeId: number | null;        // set when dragging an existing node
  sourceComponentName: string | null; // set when dragging a new component
  isNewComponent: boolean;            // true = from palette, false = existing node
  dropTargetId: number | null;        // target parent node
  dropIndex: number;                  // insertion index within the target's children
  dropSlot: string;                   // target slot name
}
```

### Functions

| Function                          | Description                                          |
| --------------------------------- | ---------------------------------------------------- |
| `startDragExisting(nodeId)`       | Begin dragging an existing node from the tree.        |
| `startDragNew(componentName)`     | Begin dragging a new component from the palette.      |
| `updateDropTarget(id, index, slot)` | Update the current drop position as the user hovers. |
| `endDrag()`                       | Finalize the drag. Returns the final `DragState` and resets. |

## Provide/Inject Pattern

`PageEditor.vue` provides all four composable return values under string keys:

```ts
provide('pageBuilder', pb);
provide('editor', editor);
provide('nodeTree', nodeTree);
provide('dragDrop', dragDrop);
```

Child components inject what they need:

```ts
const editor = inject('editor')!;
const nodeTree = inject('nodeTree')!;
```

This avoids prop drilling through multiple component layers while keeping the composables
testable in isolation.

## Event Flow

A typical user action follows this path:

```
User clicks "Add PbText" in palette
  |
  v
LeftDrawer: startDragNew('PbText')
  |
  v
EditorCanvas: updateDropTarget(parentId, index, slot) on hover
  |
  v
EditorCanvas: endDrag() on drop
  |
  v
nodeTree.addNode(parentId, 'PbText', index, slot, defaultProps)
  |
  +-- cloneTree(content)
  +-- insertNode(clone, parentId, newNode, index, slot)
  +-- onUpdate(clone)          -> pb.updateContent(clone)
  +-- onSnapshot('Add PbText') -> editor.pushHistory('Add PbText', pb.getSnapshot())
  |
  v
content.value = newTree  -> Vue reactivity -> NodeRenderer re-renders
```

For property editing:

```
User changes "title" prop in RightDrawer
  |
  v
RightDrawer: emit('update-props', nodeId, { title: 'New Title' })
  |
  v
PageEditor: nodeTree.updateNodeProps(nodeId, { title: 'New Title' })
  |
  +-- cloneTree(content)
  +-- findNodeById(clone, nodeId).props = { ...props, title: 'New Title' }
  +-- onUpdate(clone)
  +-- onSnapshot('Update props')
  |
  v
Re-render
```

For undo:

```
User clicks Undo
  |
  v
EditorToolbar: emit('undo')
  |
  v
PageEditor: handleUndo()
  +-- snapshot = editor.undo()     // decrements historyIndex, returns snapshot
  +-- pb.restoreSnapshot(snapshot) // deserializes content + layout + maxId
  |
  v
content.value updated -> Re-render to previous state
```
