# Roadmap

This document outlines the planned development phases for `@improba/page-builder`, from
foundational work through production readiness and ecosystem expansion.

## Phase 1 -- Foundation

**Goal:** Establish the core data model, component registry, built-in components, and
read-mode rendering.

| Task                                      | Status      |
| ----------------------------------------- | ----------- |
| Define `INode`, `IPageData` type system   | Done        |
| Implement tree utilities (`core/tree.ts`) | Done        |
| Implement component registry (`core/registry.ts`) | Done |
| Create built-in components (PbRow, PbColumn, PbText, PbImage, PbSection, PbContainer) | Done |
| Build `NodeRenderer` with recursive rendering | Done    |
| Build `PageReader` for read mode          | Done        |
| Implement template variable interpolation | Done        |
| Create Vue plugin for registration        | Done        |
| Set up build pipeline (Vite library mode) | Done        |
| Configure TypeScript, ESLint, Prettier    | Done        |
| Set up Vitest for testing                 | Done        |

**Deliverable:** A working read-mode renderer that can display any page from backend JSON.

## Phase 2 -- Edit Mode MVP

**Goal:** Deliver a functional WYSIWYG editor with the core editing capabilities.

| Task                                      | Status      |
| ----------------------------------------- | ----------- |
| `usePageBuilder` composable (state, snapshots) | Done   |
| `useEditor` composable (selection, history, viewport) | Done |
| `useNodeTree` composable (add, delete, move, duplicate, update props) | Done |
| `useDragDrop` composable (palette + reorder drag) | Done |
| `PageEditor` layout (toolbar, drawers, canvas) | Done   |
| `EditorToolbar` (undo, redo, save, viewport presets) | Done |
| `LeftDrawer` component palette (grouped by category) | Done |
| `RightDrawer` property editor (typed widgets) | Done    |
| `EditorCanvas` with selection and hover overlays | Done |
| Provide/inject wiring for editor context  | Done        |
| History (undo/redo) via JSON snapshots    | Done        |
| Drag-and-drop: palette to canvas          | Done        |
| Drag-and-drop: reorder within tree        | Done        |
| Node duplication with recursive ID renewal| Done        |
| Save event with `IPageSavePayload`        | Done        |

**Deliverable:** A working page editor where users can add, arrange, configure, and remove
components visually.

## Phase 3 -- Advanced Features

**Goal:** Enhance the editor with professional-grade capabilities.

| Task                                      | Status      |
| ----------------------------------------- | ----------- |
| Iframe isolation for the editor canvas    | Planned     |
| Rich text inline editing (contenteditable)| Planned     |
| Media manager integration (image upload, gallery) | Planned |
| Responsive preview with live viewport resizing | Planned |
| Keyboard shortcuts (delete, duplicate, arrow navigation) | Planned |
| Copy/paste nodes (clipboard integration)  | Planned     |
| Multi-select and batch operations         | Planned     |
| Node tree panel (collapsible tree view)   | Planned     |
| Drag handle UI for reordering             | Planned     |
| Slot visualization in the editor          | Planned     |
| Component search/filter in palette        | Planned     |
| Prop validation feedback in the editor    | Planned     |

**Deliverable:** A polished, feature-rich editor comparable to commercial page builders.

## Phase 4 -- Production Readiness

**Goal:** Harden the library for production use with performance, accessibility, and
reliability improvements.

| Task                                      | Status      |
| ----------------------------------------- | ----------- |
| SSR validation and Nuxt compatibility testing | Planned |
| Performance profiling and optimization    | Planned     |
| Large tree handling (virtualization, lazy rendering) | Planned |
| Accessibility audit (ARIA roles, keyboard navigation, screen reader) | Planned |
| Internationalization (i18n) for editor UI | Planned     |
| Comprehensive unit test coverage (>80%)   | Planned     |
| Integration tests for editor workflows    | Planned     |
| Error boundaries and graceful degradation | Planned     |
| JSON schema validation at import time     | Planned     |
| Migration utilities for schema versioning | Planned     |
| Bundle size optimization and tree-shaking audit | Planned |
| Documentation site with live examples     | Planned     |

**Deliverable:** A production-grade library with confidence in reliability, performance, and
accessibility.

## Phase 5 -- Ecosystem

**Goal:** Expand the library's reach with framework integrations and developer tooling.

| Task                                      | Status      |
| ----------------------------------------- | ----------- |
| Nuxt module (`@improba/page-builder-nuxt`) | Planned    |
| Storybook stories for all built-in components | Planned |
| Storybook stories for editor UI components | Planned    |
| Component starter template / scaffolding CLI | Planned  |
| Published documentation site              | Planned     |
| Changelog + release automation (Release Please + npm publish workflow) | Done |
| Visual regression testing                 | Planned     |
| Theme presets (light, dark, custom)       | Planned     |
| Plugin API for extending editor behavior  | Planned     |
| Community component pack examples         | Planned     |

**Deliverable:** A well-documented, well-integrated ecosystem that makes it easy to adopt
and extend the page builder.

## Priority Notes

- Phases 1 and 2 are complete and form the current state of the library.
- Phase 3 items are prioritized by user impact: iframe isolation and rich text editing are
  the highest priorities.
- Phase 4 and 5 items can be tackled in parallel as resources allow.
- The roadmap is subject to change based on user feedback and project priorities.
