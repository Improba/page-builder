# Component Registry

The component registry is the central mechanism that maps component names (as stored in the
JSON tree) to their Vue component implementations and editor metadata. Every component used
in a page -- whether built-in or custom -- must be registered before the page can render.

## Registering Components

### Single component

```ts
import { registerComponent } from '@improba/page-builder';

registerComponent({
  name: 'MyCard',
  label: 'Card',
  description: 'A content card with title and body.',
  category: 'content',
  component: MyCardComponent,
  slots: [{ name: 'default', label: 'Body' }],
  editableProps: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Untitled' },
    { key: 'elevated', label: 'Elevated', type: 'boolean', defaultValue: false },
  ],
  defaultProps: { title: 'Untitled', elevated: false },
});
```

### Multiple components

```ts
import { registerComponents } from '@improba/page-builder';

registerComponents([myCardDefinition, myHeroDefinition, myFooterDefinition]);
```

`registerComponent()` throws if a component with the same `name` is already registered. Use
`replaceComponent()` to override an existing registration.

### Via the Vue plugin

The simplest way to register everything at once is through the Vue plugin:

```ts
import { createApp } from 'vue';
import { PageBuilderPlugin } from '@improba/page-builder';
import '@improba/page-builder/style.css';

const app = createApp(App);

app.use(PageBuilderPlugin, {
  registerBuiltIn: true,          // default: registers PbColumn, PbRow, etc.
  components: [myCardDefinition], // additional custom components
  globalName: 'PageBuilder',      // registers <PageBuilder> globally (set false to skip)
});
```

**Plugin options:**

| Option           | Type                         | Default          | Description                              |
| ---------------- | ---------------------------- | ---------------- | ---------------------------------------- |
| `registerBuiltIn`| `boolean`                    | `true`           | Register the six built-in components     |
| `components`     | `IComponentDefinition[]`     | `[]`             | Custom components to register            |
| `globalName`     | `string \| false`            | `'PageBuilder'`  | Global component name, or `false` to skip |

## IComponentDefinition Interface

Every component registration must conform to `IComponentDefinition`:

```ts
interface IComponentDefinition {
  name: string;                       // Unique key, matches INode.name
  label: string;                      // Display name in the editor palette
  description?: string;               // Tooltip text
  category: ComponentCategory;        // 'layout' | 'content' | 'media' | 'navigation' | 'form' | 'data' | 'custom'
  icon?: string;                      // Preview icon for the palette
  component: Component;               // The Vue component to render
  slots: ISlotDefinition[];           // Named slots the component exposes
  editableProps: IPropDefinition[];   // Props editable in the property editor
  defaultProps?: Record<string, unknown>; // Defaults applied on insert
  hidden?: boolean;                   // If true, hidden from the palette
}
```

### Slot definitions

Each slot the component accepts for child nodes is declared as:

```ts
interface ISlotDefinition {
  name: string;                     // Matches Vue's slot name and INode.slot
  label: string;                    // Display label in the editor
  allowedComponents?: string[];     // Restrict which components can be dropped here (empty = all)
}
```

### Prop definitions

Each editable property is declared as:

```ts
interface IPropDefinition {
  key: string;                      // Prop name on the Vue component
  label: string;                    // Display label in the property editor
  type: PropEditorType;             // Widget type: 'text' | 'textarea' | 'richtext' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'url' | 'json'
  defaultValue?: unknown;           // Default value
  required?: boolean;               // Whether the field is required
  options?: { label: string; value: string | number | boolean }[]; // For 'select' type
  validation?: {                    // Validation rules
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}
```

## Built-in Components

The library ships with six built-in components covering common layout and content needs:

| Name           | Category  | Slots     | Key Props                         |
| -------------- | --------- | --------- | --------------------------------- |
| `PbColumn`     | layout    | default   | `width`, `minWidth`, `padding`    |
| `PbRow`        | layout    | default   | `gap`, `wrap`, `justify`          |
| `PbText`       | content   | (none)    | `content` (HTML), `tag`           |
| `PbImage`      | media     | (none)    | `src`, `alt`, `width`, `height`   |
| `PbSection`    | layout    | default   | `padding`, `background`           |
| `PbContainer`  | layout    | default   | `maxWidth`, `padding`             |

Built-in components are registered automatically when using the Vue plugin with
`registerBuiltIn: true` (the default).

## Creating a Custom Component

A custom component follows the same pattern as built-in ones. The recommended approach is to
co-locate the component definition with the Vue component using a non-`setup` script block
for the `builderOptions` export:

```vue
<script lang="ts">
import type { IComponentDefinition } from '@improba/page-builder';

export const builderOptions: IComponentDefinition = {
  name: 'MyHero',
  label: 'Hero Banner',
  description: 'Full-width hero section with title and call-to-action.',
  category: 'content',
  component: {} as any, // Placeholder; replaced at registration time
  slots: [{ name: 'default', label: 'Content' }],
  editableProps: [
    { key: 'title', label: 'Title', type: 'text', defaultValue: 'Hello World' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', defaultValue: '' },
    { key: 'backgroundUrl', label: 'Background Image', type: 'image' },
    { key: 'height', label: 'Height', type: 'text', defaultValue: '400px' },
  ],
  defaultProps: { title: 'Hello World', subtitle: '', height: '400px' },
};
</script>

<script setup lang="ts">
defineProps({
  title: { type: String, default: 'Hello World' },
  subtitle: { type: String, default: '' },
  backgroundUrl: { type: String, default: '' },
  height: { type: String, default: '400px' },
});
</script>

<template>
  <section :style="{ height, backgroundImage: `url(${backgroundUrl})` }">
    <h1>{{ title }}</h1>
    <p v-if="subtitle">{{ subtitle }}</p>
    <slot />
  </section>
</template>
```

Then register it:

```ts
import MyHero, { builderOptions } from './MyHero.vue';

registerComponent({ ...builderOptions, component: MyHero });
```

The `component: {} as any` placeholder in the `.vue` file is replaced with the actual
component reference at registration time. This avoids circular imports between the component
and its definition.

## Registry API Reference

| Function                    | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `registerComponent(def)`    | Register a single component. Throws on duplicate name. |
| `registerComponents(defs)`  | Register multiple components at once.                  |
| `replaceComponent(def)`     | Replace an existing registration (no throw).           |
| `unregisterComponent(name)` | Remove a component from the registry.                  |
| `getComponent(name)`        | Get a definition by name, or `undefined`.              |
| `resolveComponent(name)`    | Get the Vue component by name. Throws if not found.    |
| `getRegisteredComponents()` | Get all registered definitions as an array.            |
| `getComponentsByCategory()` | Get definitions grouped by category (Map).             |
| `hasComponent(name)`        | Check if a name is registered.                         |
| `clearRegistry()`           | Remove all registrations (for testing).                |

The registry is backed by a Vue `reactive(Map)`, so any component that reads from it will
automatically re-render when registrations change.
