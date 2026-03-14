[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / UsePageBuilderReturn

# Interface: UsePageBuilderReturn

Defined in: src/composables/use-page-builder.ts:16

## Properties

### content

> **content**: `Ref`\<[`INode`](INode.md)\>

Defined in: src/composables/use-page-builder.ts:19

***

### getSnapshot()

> **getSnapshot**: () => `string`

Defined in: src/composables/use-page-builder.ts:29

#### Returns

`string`

***

### isDirty

> **isDirty**: `Ref`\<`boolean`\>

Defined in: src/composables/use-page-builder.ts:23

***

### layout

> **layout**: `Ref`\<[`INode`](INode.md)\>

Defined in: src/composables/use-page-builder.ts:20

***

### maxId

> **maxId**: `Ref`\<`number`\>

Defined in: src/composables/use-page-builder.ts:21

***

### mode

> **mode**: `Ref`\<[`PageBuilderMode`](../type-aliases/PageBuilderMode.md)\>

Defined in: src/composables/use-page-builder.ts:17

***

### nextId()

> **nextId**: () => `number`

Defined in: src/composables/use-page-builder.ts:28

#### Returns

`number`

***

### pageData

> **pageData**: `ComputedRef`\<[`IPageData`](IPageData.md)\>

Defined in: src/composables/use-page-builder.ts:18

***

### reset()

> **reset**: () => `void`

Defined in: src/composables/use-page-builder.ts:31

#### Returns

`void`

***

### restoreSnapshot()

> **restoreSnapshot**: (`snapshot`) => `void`

Defined in: src/composables/use-page-builder.ts:30

#### Parameters

##### snapshot

`string`

#### Returns

`void`

***

### setMode()

> **setMode**: (`newMode`) => `void`

Defined in: src/composables/use-page-builder.ts:25

#### Parameters

##### newMode

[`PageBuilderMode`](../type-aliases/PageBuilderMode.md)

#### Returns

`void`

***

### updateContent()

> **updateContent**: (`newContent`) => `void`

Defined in: src/composables/use-page-builder.ts:26

#### Parameters

##### newContent

[`INode`](INode.md)

#### Returns

`void`

***

### updateLayout()

> **updateLayout**: (`newLayout`) => `void`

Defined in: src/composables/use-page-builder.ts:27

#### Parameters

##### newLayout

[`INode`](INode.md)

#### Returns

`void`

***

### variables

> **variables**: `Ref`\<`Record`\<`string`, `string`\>\>

Defined in: src/composables/use-page-builder.ts:22
