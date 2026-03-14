[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / IPageBuilderEvents

# Interface: IPageBuilderEvents

Defined in: src/types/editor.ts:68

Events emitted by the page builder in edit mode.

## Properties

### change

> **change**: \[[`INode`](INode.md)\]

Defined in: src/types/editor.ts:73

Emitted when the tree structure changes.

***

### save

> **save**: \[[`IPageSavePayload`](IPageSavePayload.md)\]

Defined in: src/types/editor.ts:70

Emitted when the user saves (Ctrl+S or save button).

***

### select

> **select**: \[`number` \| `null`\]

Defined in: src/types/editor.ts:76

Emitted when a node is selected.
