[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / IPageData

# Interface: IPageData

Defined in: src/types/node.ts:32

Full page data structure returned by the backend.
This is the single JSON payload the frontend receives.

## Properties

### content

> **content**: [`INode`](INode.md)

Defined in: src/types/node.ts:37

The root node of the page content tree.

***

### layout

> **layout**: [`INode`](INode.md)

Defined in: src/types/node.ts:40

The root node of the page layout tree. Layout wraps content.

***

### maxId

> **maxId**: `number`

Defined in: src/types/node.ts:43

Maximum node ID used in the tree. Incremented when adding new nodes.

***

### meta

> **meta**: [`IPageMeta`](IPageMeta.md)

Defined in: src/types/node.ts:34

Page metadata

***

### variables

> **variables**: `Record`\<`string`, `string`\>

Defined in: src/types/node.ts:46

Variables injected into component props via `{{ VAR }}` syntax.
