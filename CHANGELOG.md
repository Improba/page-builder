# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.4] - 2026-04-16

### Changed

- The left drawer "Components" section is now collapsible (like the "Tree"
  section) via a toggle button in its header.
- Component categories are collapsed by default to reduce visual clutter.
  Searching auto-expands matching categories so results remain visible.
- Removed the redundant drawer title; each section is self-labeled.

## [0.3.3] - 2026-04-16

### Added

- Collapsible component categories in the left drawer palette. Each category
  heading is now a toggle button with a chevron indicator; categories are
  expanded by default and can be collapsed to reduce visual clutter.

### Fixed

- Editable zones nested inside readonly parents can be hovered and selected
  again. The `pointer-events: none` rule on `[data-ipb-readonly]` was blocking
  all descendant interactions; non-readonly child nodes now re-enable pointer
  events via an inheritance override.

## [0.3.2] - 2026-04-16

### Changed

- Reduced readonly zone overlay intensity (`opacity` from `0.6` to `0.8`) so
  non-editable areas are still visually distinct but less washed-out.

### Fixed

- Readonly zones on the canvas can no longer be selected, hovered, or
  right-clicked. Added `pointer-events: none` to `[data-ipb-readonly]` elements
  in both `IframeCanvas` and `EditorCanvas`.

## [0.2.3] - 2026-04-15

### Fixed

- Fixed list markers (bullets and numbers) not showing in the rich text editor
  and iframe canvas. CSS resets (Tailwind/Nuxt UI) were stripping `list-style`.
  Explicitly set `list-style-type: disc` on `<ul>`, `list-style-type: decimal`
  on `<ol>`, and `display: list-item` on `<li>` in both the editor component and
  the iframe base styles.

## [0.2.1] - 2026-04-15

### Added

- Lucide icon support in the component palette. Custom components can now use
  `icon: 'i-lucide-lock'` (or any `i-lucide-*` name) and the palette renders the
  actual SVG icon instead of displaying the raw string. Built-in components still
  use emoji/unicode icons and continue to work as before.
- New internal `PbIcon` component that resolves `i-lucide-*` names to inline SVGs
  using bundled [Lucide](https://lucide.dev/) icon data.
- Added `lucide` as a direct dependency (~120 KB gzipped) for icon rendering.

### Fixed

- Fixed selection/hover overlay misposition in `IframeCanvas` when the iframe
  content was scrolled. `getOverlayRect()` was double-counting the scroll offset
  by adding `scrollY`/`scrollX` to coordinates already relative to the iframe
  viewport via `getBoundingClientRect()`.
- Fixed context menu positioning in `IframeCanvas` (both fallback DOM and iframe
  bridge paths) that suffered from the same scroll double-counting bug.

## [0.1.0] - 2026-03-12

### Added

- Initial public package structure for `@improba/page-builder`.
- Core data model and tree/registry utilities for JSON-driven page rendering.
- Read mode renderer and edit mode foundation with component registry integration.
- Built-in component set and Vue plugin integration.
- Unit/integration test setup, Docker-based developer workflow, and TypeDoc API generation.

[Unreleased]: https://github.com/improba/page-builder/compare/v0.3.4...HEAD
[0.3.4]: https://github.com/improba/page-builder/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/improba/page-builder/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/improba/page-builder/compare/v0.3.1...v0.3.2
[0.2.3]: https://github.com/improba/page-builder/compare/v0.2.1...v0.2.3
[0.2.1]: https://github.com/improba/page-builder/compare/v0.1.0...v0.2.1
[0.1.0]: https://github.com/improba/page-builder/releases/tag/v0.1.0
