[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / PageBuilderPluginOptions

# Interface: PageBuilderPluginOptions

Defined in: src/plugin.ts:9

## Properties

### components?

> `optional` **components**: [`IComponentDefinition`](IComponentDefinition.md)[]

Defined in: src/plugin.ts:11

Custom components to register in addition to built-in ones.

***

### globalName?

> `optional` **globalName**: `string` \| `false`

Defined in: src/plugin.ts:17

Global component name for <PageBuilder>. Default: 'PageBuilder'. Set to false to skip global registration.

***

### locale?

> `optional` **locale**: `string`

Defined in: src/plugin.ts:20

Default locale for editor UI text. Can be overridden per <PageBuilder> instance.

***

### messages?

> `optional` **messages**: [`TranslationDictionary`](../type-aliases/TranslationDictionary.md)

Defined in: src/plugin.ts:23

Additional/overridden translation messages grouped by locale.

***

### registerBuiltIn?

> `optional` **registerBuiltIn**: `boolean`

Defined in: src/plugin.ts:14

If false, built-in components (PbColumn, PbRow, etc.) won't be registered. Default: true.
