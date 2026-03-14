[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / IComponentDefinition

# Interface: IComponentDefinition

Defined in: src/types/component.ts:7

Metadata describing a page builder component.
Every component registered in the page builder must provide this.

## Properties

### category

> **category**: [`ComponentCategory`](../type-aliases/ComponentCategory.md)

Defined in: src/types/component.ts:18

Category for grouping in the component palette.

***

### component

> **component**: `Component`

Defined in: src/types/component.ts:24

The Vue component to render.

***

### defaultProps?

> `optional` **defaultProps**: `Record`\<`string`, `unknown`\>

Defined in: src/types/component.ts:33

Default props applied when the component is first added.

***

### description?

> `optional` **description**: `string`

Defined in: src/types/component.ts:15

Short description for the editor tooltip.

***

### editableProps

> **editableProps**: [`IPropDefinition`](IPropDefinition.md)[]

Defined in: src/types/component.ts:30

Editable props schema for the right-drawer property editor.

***

### hidden?

> `optional` **hidden**: `boolean`

Defined in: src/types/component.ts:36

If true, this component cannot be added by users (used for internal wrappers).

***

### icon?

> `optional` **icon**: `string`

Defined in: src/types/component.ts:21

URL or import path of a preview icon/thumbnail for the palette.

***

### label

> **label**: `string`

Defined in: src/types/component.ts:12

Human-readable label shown in the editor palette.

***

### name

> **name**: `string`

Defined in: src/types/component.ts:9

Unique name used as key in the registry and in INode.name.

***

### slots

> **slots**: [`ISlotDefinition`](ISlotDefinition.md)[]

Defined in: src/types/component.ts:27

Named slots this component exposes for child nodes.
