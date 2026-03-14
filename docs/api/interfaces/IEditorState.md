[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / IEditorState

# Interface: IEditorState

Defined in: src/types/editor.ts:10

Editor UI state managed by the useEditor composable.
Drag-and-drop state is managed separately by useDragDrop.

## Properties

### canvasScale

> **canvasScale**: `number`

Defined in: src/types/editor.ts:33

Viewport scale for the canvas iframe.

***

### history

> **history**: [`IEditorHistoryEntry`](IEditorHistoryEntry.md)[]

Defined in: src/types/editor.ts:24

Undo/redo history stack.

***

### historyIndex

> **historyIndex**: `number`

Defined in: src/types/editor.ts:27

Current position in the history stack.

***

### hoveredNodeId

> **hoveredNodeId**: `number` \| `null`

Defined in: src/types/editor.ts:15

Currently hovered node, or null.

***

### isDirty

> **isDirty**: `boolean`

Defined in: src/types/editor.ts:30

Dirty flag — true if unsaved changes exist.

***

### leftDrawerOpen

> **leftDrawerOpen**: `boolean`

Defined in: src/types/editor.ts:18

Whether the left drawer (component palette) is open.

***

### rightDrawerOpen

> **rightDrawerOpen**: `boolean`

Defined in: src/types/editor.ts:21

Whether the right drawer (property editor) is open.

***

### selectedNodeId

> **selectedNodeId**: `number` \| `null`

Defined in: src/types/editor.ts:12

Currently selected node, or null.

***

### viewport

> **viewport**: [`ViewportPreset`](../type-aliases/ViewportPreset.md)

Defined in: src/types/editor.ts:36

Viewport preset.
