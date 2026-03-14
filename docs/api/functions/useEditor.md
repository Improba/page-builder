[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / useEditor

# Function: useEditor()

> **useEditor**(`options?`): `object`

Defined in: src/composables/use-editor.ts:25

Composable managing the editor UI state (selection, drawers, history, viewport).
Drag-and-drop state is handled separately by useDragDrop.

## Parameters

### options?

`UseEditorOptions` = `{}`

## Returns

`object`

### canRedo

> **canRedo**: `ComputedRef`\<`boolean`\>

### canUndo

> **canUndo**: `ComputedRef`\<`boolean`\>

### canvasScale

> **canvasScale**: `Ref`\<`number`, `number`\>

### history

> **history**: `Ref`\<`object`[], `object`[]\>

### historyIndex

> **historyIndex**: `Ref`\<`number`, `number`\>

### hoveredNodeId

> **hoveredNodeId**: `Ref`\<`number` \| `null`, `number` \| `null`\>

### hoverNode()

> **hoverNode**: (`id`) => `void`

#### Parameters

##### id

`number` | `null`

#### Returns

`void`

### isDirty

> **isDirty**: `Ref`\<`boolean`, `boolean`\>

### leftDrawerOpen

> **leftDrawerOpen**: `Ref`\<`boolean`, `boolean`\>

### pushHistory()

> **pushHistory**: (`label`, `snapshot`) => `void`

#### Parameters

##### label

`string`

##### snapshot

`string`

#### Returns

`void`

### redo()

> **redo**: () => `string` \| `undefined`

#### Returns

`string` \| `undefined`

### rightDrawerOpen

> **rightDrawerOpen**: `Ref`\<`boolean`, `boolean`\>

### selectedNodeId

> **selectedNodeId**: `Ref`\<`number` \| `null`, `number` \| `null`\>

### selectNode()

> **selectNode**: (`id`) => `void`

#### Parameters

##### id

`number` | `null`

#### Returns

`void`

### setHistoryBaseline()

> **setHistoryBaseline**: (`snapshot`, `label`) => `void`

#### Parameters

##### snapshot

`string`

##### label?

`string` = `initialLabel`

#### Returns

`void`

### setViewport()

> **setViewport**: (`preset`) => `void`

#### Parameters

##### preset

[`ViewportPreset`](../type-aliases/ViewportPreset.md)

#### Returns

`void`

### toggleLeftDrawer()

> **toggleLeftDrawer**: () => `void`

#### Returns

`void`

### toggleRightDrawer()

> **toggleRightDrawer**: () => `void`

#### Returns

`void`

### undo()

> **undo**: () => `string` \| `undefined`

#### Returns

`string` \| `undefined`

### viewport

> **viewport**: `Ref`
