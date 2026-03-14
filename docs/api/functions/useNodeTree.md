[**@improba/page-builder**](../README.md)

***

[@improba/page-builder](../README.md) / useNodeTree

# Function: useNodeTree()

> **useNodeTree**(`__namedParameters`): `object`

Defined in: src/composables/use-node-tree.ts:25

Composable for manipulating the node tree (add, remove, move, update props).
All mutations clone before modifying to preserve immutability for history.

## Parameters

### \_\_namedParameters

[`UseNodeTreeOptions`](../interfaces/UseNodeTreeOptions.md)

## Returns

`object`

### addNode()

> **addNode**: (`parentId`, `componentName`, `index`, `slot`, `defaultProps?`) => `number` \| `null`

#### Parameters

##### parentId

`number`

##### componentName

`string`

##### index

`number`

##### slot?

`string` = `'default'`

##### defaultProps?

`Record`\<`string`, `unknown`\>

#### Returns

`number` \| `null`

### canMoveNodeDown()

> **canMoveNodeDown**: (`nodeId`) => `boolean`

#### Parameters

##### nodeId

`number`

#### Returns

`boolean`

### canMoveNodeUp()

> **canMoveNodeUp**: (`nodeId`) => `boolean`

#### Parameters

##### nodeId

`number`

#### Returns

`boolean`

### deleteNode()

> **deleteNode**: (`nodeId`) => `void`

#### Parameters

##### nodeId

`number`

#### Returns

`void`

### duplicateNode()

> **duplicateNode**: (`nodeId`) => `void`

#### Parameters

##### nodeId

`number`

#### Returns

`void`

### moveNodeDown()

> **moveNodeDown**: (`nodeId`) => `void`

#### Parameters

##### nodeId

`number`

#### Returns

`void`

### moveNodeTo()

> **moveNodeTo**: (`nodeId`, `newParentId`, `index`, `slot`) => `void`

#### Parameters

##### nodeId

`number`

##### newParentId

`number`

##### index

`number`

##### slot?

`string` = `'default'`

#### Returns

`void`

### moveNodeUp()

> **moveNodeUp**: (`nodeId`) => `void`

#### Parameters

##### nodeId

`number`

#### Returns

`void`

### updateNodeProps()

> **updateNodeProps**: (`nodeId`, `props`) => `void`

#### Parameters

##### nodeId

`number`

##### props

`Record`\<`string`, `unknown`\>

#### Returns

`void`
