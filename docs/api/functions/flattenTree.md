[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / flattenTree

# Function: flattenTree()

> **flattenTree**(`root`, `options?`): [`IVirtualTreeRow`](../interfaces/IVirtualTreeRow.md)[]

Defined in: src/core/virtual-tree.ts:42

Flatten a node tree in depth-first pre-order with depth metadata.
Uses an iterative stack to avoid recursion depth issues on large trees.

## Parameters

### root

[`INode`](../interfaces/INode.md)

### options?

[`IFlattenTreeOptions`](../interfaces/IFlattenTreeOptions.md) = `{}`

## Returns

[`IVirtualTreeRow`](../interfaces/IVirtualTreeRow.md)[]
