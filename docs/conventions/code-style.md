# Code Style Conventions

This document defines the coding standards and style rules for the `@improba/page-builder`
project.

## TypeScript

### Strict mode

TypeScript is configured with `"strict": true` in `tsconfig.json`. All strict-family checks
are enabled:

- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitAny`
- `noImplicitThis`

### No `any`

Avoid `any` in all code. Use `unknown` with type narrowing, or specific types.

The one accepted exception is Vue component type workarounds where the Vue type system does
not support the pattern cleanly. For example, the `component` field placeholder in
`builderOptions`:

```ts
component: {} as any, // Placeholder; replaced with real component at registration
```

These cases must be explicit casts and should include a comment explaining why `any` is
necessary.

### Module syntax

The project uses `"verbatimModuleSyntax": true`. This means:

- Use `import type { ... }` for type-only imports.
- Use `export type { ... }` for type-only re-exports.
- Regular `import` / `export` for values.

### Target and module

- Target: `ES2022`
- Module: `ESNext` with `bundler` module resolution

## Vue Components

### Composition API only

All components use Vue 3 Composition API exclusively. The Options API is not used.

Every component must use `<script setup lang="ts">`:

```vue
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
});

const displayTitle = computed(() => props.title.toUpperCase());
</script>
```

### Dual script blocks for builderOptions

Built-in (and custom) components that need to export a static `builderOptions` use a
separate non-setup `<script lang="ts">` block alongside the `<script setup>`:

```vue
<script lang="ts">
import type { IComponentDefinition } from '@/types/component';

export const builderOptions: IComponentDefinition = { ... };
</script>

<script setup lang="ts">
// Component logic here
</script>
```

### Props

- Use `defineProps()` with the object syntax and explicit `type` / `default` / `required`.
- Props must be typed. Avoid `any` in prop types.

### Emits

- Use `defineEmits<{ ... }>()` with typed event signatures.

## CSS

### Scoped styles

All component styles must use `<style scoped>` to prevent leakage.

### BEM-like naming with `ipb-` prefix

CSS class names follow a BEM-inspired convention with a project prefix:

```
.ipb-{block}
.ipb-{block}__{element}
.ipb-{block}--{modifier}
```

Examples:

```css
.ipb-page-editor { }
.ipb-page-editor__body { }
.ipb-page-editor--fullscreen { }
.ipb-editor-toolbar { }
.ipb-editor-toolbar__button { }
.ipb-editor-toolbar__button--active { }
```

The `ipb-` prefix (Improba Page Builder) prevents collisions with consumer application
styles.

### CSS custom properties for theming

Themeable values use CSS custom properties with the `--ipb-` prefix and provide sensible
fallbacks:

```css
.ipb-page-editor {
  background: var(--ipb-editor-bg, #f0f2f5);
}
```

Consumers can override these properties in their own stylesheets:

```css
:root {
  --ipb-editor-bg: #1a1a2e;
}
```

## File Naming

| Type             | Convention       | Example                   |
| ---------------- | ---------------- | ------------------------- |
| Vue components   | PascalCase       | `PageBuilder.vue`, `PbRow.vue` |
| TypeScript files | kebab-case       | `use-editor.ts`, `tree.ts`    |
| Type files       | kebab-case       | `node.ts`, `component.ts`     |
| Directories      | kebab-case       | `built-in/`, `composables/`   |

## Export Patterns

### Barrel exports via `index.ts`

Each module directory has an `index.ts` that re-exports its public API:

- `src/types/index.ts` -- Re-exports all types.
- `src/built-in/index.ts` -- Re-exports built-in components and definitions.
- `src/index.ts` -- The top-level barrel that re-exports the entire public API.

### Named exports only

All exports are named. Default exports are used only for Vue SFC components (which Vue
requires). Functions, types, and constants use named exports.

```ts
// Good
export function registerComponent(def: IComponentDefinition): void { ... }
export type { INode } from './node';

// Avoid
export default function registerComponent(...) { ... }
```

## Documentation

### JSDoc on public API

All exported functions, interfaces, and types must have JSDoc comments:

```ts
/**
 * Register a component for use in the page builder.
 * Throws if a component with the same name is already registered.
 */
export function registerComponent(definition: IComponentDefinition): void { ... }
```

### Generated API reference

Public API reference docs are generated with TypeDoc from `src/index.ts` and written to
`docs/api/`.

Use Docker to regenerate:

```bash
docker compose -f docker/docker-compose.yml run --rm dev npm run docs:api
```

### Parameter documentation

Use `@param` tags for non-obvious parameters. Skip them when the parameter name and type are
self-explanatory.

### No redundant comments

Do not add comments that merely restate what the code does:

```ts
// Bad: redundant
const count = 0; // Initialize count to zero

// Good: explains intent
const _initialSnapshot = JSON.stringify(initialData); // Kept for reset()
```

## Formatting

The project uses Prettier for automated formatting. Configuration is in `.prettierrc`.
Run formatting with:

```bash
npm run format
```

ESLint is configured for TypeScript and Vue files. Run linting with:

```bash
npm run lint        # Check
npm run lint:fix    # Auto-fix
```

Type checking is performed with `vue-tsc`:

```bash
npm run typecheck
```
