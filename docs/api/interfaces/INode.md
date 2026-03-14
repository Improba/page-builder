[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / INode

# Interface: INode

Defined in: src/types/node.ts:8

Core tree node representing a single component instance in the page tree.

The page structure is a recursive tree of INode objects.
Each node maps to a registered component and can contain children
distributed across named slots.

## Properties

### children

> **children**: `INode`[]

Defined in: src/types/node.ts:22

Child nodes, rendered into the component's slots.

***

### id

> **id**: `number`

Defined in: src/types/node.ts:10

Unique identifier within the tree. Used for selection, drag-drop, and reconciliation.

***

### name

> **name**: `string`

Defined in: src/types/node.ts:13

Component name — must match a key in the component registry.

***

### props

> **props**: `Record`\<`string`, `unknown`\>

Defined in: src/types/node.ts:19

Props passed to the component instance. Supports template variables via `{{ VAR }}`.

***

### readonly?

> `optional` **readonly**: `boolean`

Defined in: src/types/node.ts:25

If true, this node cannot be edited, moved, or deleted in edit mode.

***

### slot

> **slot**: `string` \| `null`

Defined in: src/types/node.ts:16

Target slot name in the parent component. `null` for the root node.
