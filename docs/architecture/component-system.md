# Component System Architecture

The component system is the mechanism by which component names in the JSON tree are resolved
to live Vue components with full editor metadata. It is built on a registry pattern backed by
a reactive `Map`.

## Registry Pattern

The registry is a module-level singleton:

```ts
const _registry = reactive(new Map<string, IComponentDefinition>());
```

Using Vue's `reactive()` wrapper ensures that any computed property or render function reading
from the registry automatically re-evaluates when registrations change.

The registry is intentionally a singleton rather than instance-based. This means:

- All components are globally available, regardless of which `<PageBuilder>` instance is
  rendering.
- Registration happens once at app startup (typically via the Vue plugin).
- SSR environments share the same registry across requests within a single process.

## Component Resolution Pipeline

When `NodeRenderer` encounters an `INode`, the following pipeline executes:

```
INode.name
  |
  v
resolveComponent(name)
  |
  |-- _registry.get(name) -> IComponentDefinition | undefined
  |
  |-- if undefined: throw Error with available names
  |-- if found:     return definition.component (Vue Component)
  |
  v
<component :is="resolvedComponent" v-bind="interpolatedProps">
```

### Step-by-step

1. **Name lookup** -- `resolveComponent(name)` calls `_registry.get(name)`.
2. **Error on miss** -- If no definition exists, an error is thrown listing all registered
   component names for debugging.
3. **Component extraction** -- The `component` field of `IComponentDefinition` is returned.
   This is a Vue component object (imported SFC or `defineComponent` result).
4. **Rendering** -- Vue's `<component :is="...">` dynamic component renders the result with
   interpolated props and slotted children.

For the editor palette and property editor, `getComponent(name)` retrieves the full
`IComponentDefinition` (including `editableProps`, `slots`, `label`, etc.) without extracting
just the Vue component.

## IComponentDefinition Schema

```ts
interface IComponentDefinition {
  name: string;
  label: string;
  description?: string;
  category: ComponentCategory;
  icon?: string;
  component: Component;
  slots: ISlotDefinition[];
  editableProps: IPropDefinition[];
  defaultProps?: Record<string, unknown>;
  hidden?: boolean;
}
```

### `slots: ISlotDefinition[]`

Declares which named slots the component exposes for child node placement:

```ts
interface ISlotDefinition {
  name: string;
  label: string;
  allowedComponents?: string[];
}
```

- `name` -- The Vue slot name (e.g., `"default"`, `"header"`, `"sidebar"`).
- `label` -- Display name in the editor ("Content", "Header", "Sidebar").
- `allowedComponents` -- Optional whitelist of component names that can be dropped into this
  slot. An empty array (or omission) means all components are allowed.

Components with no slots (e.g., `PbText`, `PbImage`) declare `slots: []`, indicating they
are leaf nodes that cannot accept children.

### `editableProps: IPropDefinition[]`

Declares which props appear in the right-drawer property editor and what widget renders them:

```ts
interface IPropDefinition {
  key: string;
  label: string;
  type: PropEditorType;
  defaultValue?: unknown;
  required?: boolean;
  options?: { label: string; value: string | number | boolean }[];
  validation?: { min?: number; max?: number; pattern?: string; message?: string };
}
```

Supported `PropEditorType` values:

| Type       | Widget                        | Value type              |
| ---------- | ----------------------------- | ----------------------- |
| `text`     | Single-line input             | `string`                |
| `textarea` | Multi-line input              | `string`                |
| `richtext` | Rich text / HTML editor       | `string` (HTML)         |
| `number`   | Numeric input                 | `number`                |
| `boolean`  | Toggle switch                 | `boolean`               |
| `select`   | Dropdown                      | `string \| number \| boolean` |
| `color`    | Color picker                  | `string` (hex/rgb)      |
| `image`    | Image URL picker              | `string` (URL)          |
| `url`      | URL input                     | `string` (URL)          |
| `json`     | Raw JSON editor               | `unknown`               |

## Built-in vs Custom Components

### Built-in components

The library ships with six components:

```
PbColumn   (layout)   -- Flex column with width control
PbRow      (layout)   -- Flex row with gap, wrap, justify
PbText     (content)  -- HTML text block
PbImage    (media)    -- Image with src/alt
PbSection  (layout)   -- Full-width section
PbContainer(layout)   -- Max-width container
```

Each built-in component co-locates its `IComponentDefinition` as an exported
`builderOptions` constant in the `.vue` file. The `component` field is set to a placeholder
(`{} as any`) and replaced with the actual component reference in `built-in/index.ts`:

```ts
function withComponent(options: IComponentDefinition, component: any): IComponentDefinition {
  return { ...options, component };
}

export const builtInComponents: IComponentDefinition[] = [
  withComponent(pbColumnOptions, PbColumn),
  withComponent(pbRowOptions, PbRow),
  // ...
];
```

### Custom components

Consumers register custom components in the same way. The recommended pattern:

1. Define `builderOptions` in the Vue component file (regular `<script>` block).
2. Import both the component and its options.
3. Call `registerComponent({ ...builderOptions, component: MyComponent })`.

Or pass an array via the plugin's `components` option.

## Plugin Installation Flow

When `app.use(PageBuilderPlugin, options)` is called:

```
PageBuilderPlugin.install(app, options)
  |
  |-- if registerBuiltIn !== false:
  |     registerComponents(builtInComponents)
  |       -> registers PbColumn, PbRow, PbText, PbImage, PbSection, PbContainer
  |
  |-- if options.components.length > 0:
  |     registerComponents(options.components)
  |       -> registers each custom IComponentDefinition
  |
  |-- if globalName !== false:
  |     app.component(globalName, PageBuilder)
  |       -> makes <PageBuilder> available globally
```

After installation, all registered components are available for rendering in both read and
edit modes.

## Thread Safety and SSR Considerations

The registry is a module-level singleton, which has implications for SSR:

- In a Node.js server handling multiple requests, the registry is shared across all requests.
- Components should be registered once during server startup (e.g., in a Nuxt plugin), not
  per-request.
- Since the registry only stores definitions (not request-specific state), sharing is safe as
  long as registrations are deterministic and identical across requests.
