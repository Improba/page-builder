[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / walkTree

# Function: walkTree()

> **walkTree**(`root`, `visitor`, `depth?`): `boolean`

Defined in: src/core/tree.ts:140

Walk the tree depth-first and call visitor for each node.
Return `false` from visitor to stop the entire traversal (not just the subtree).

## Parameters

### root

[`INode`](../interfaces/INode.md)

### visitor

(`node`, `depth`) => `boolean` \| `void`

### depth?

`number` = `0`

## Returns

`boolean`
