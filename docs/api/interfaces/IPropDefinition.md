[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / IPropDefinition

# Interface: IPropDefinition

Defined in: src/types/component.ts:59

## Properties

### defaultValue?

> `optional` **defaultValue**: `unknown`

Defined in: src/types/component.ts:70

Default value.

***

### key

> **key**: `string`

Defined in: src/types/component.ts:61

Prop key (matches the component prop name).

***

### label

> **label**: `string`

Defined in: src/types/component.ts:64

Human-readable label for the property editor.

***

### options?

> `optional` **options**: `object`[]

Defined in: src/types/component.ts:76

For 'select' type — available options.

#### label

> **label**: `string`

#### value

> **value**: `string` \| `number` \| `boolean`

***

### required?

> `optional` **required**: `boolean`

Defined in: src/types/component.ts:73

Whether this prop is required.

***

### type

> **type**: [`PropEditorType`](../type-aliases/PropEditorType.md)

Defined in: src/types/component.ts:67

Editor widget type.

***

### validation?

> `optional` **validation**: `object`

Defined in: src/types/component.ts:79

Validation rules.

#### max?

> `optional` **max**: `number`

#### message?

> `optional` **message**: `string`

#### min?

> `optional` **min**: `number`

#### pattern?

> `optional` **pattern**: `string`
