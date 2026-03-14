# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Added release automation with a GitHub Actions workflow using Release Please.
- Added semantic versioning strategy based on Conventional Commits.
- Added release scripts for local verification and dry-run package inspection.

### Changed

- Hardened `prepublishOnly` to run typecheck, tests, build, type generation, and API docs generation before publish.
- Updated release documentation with CI/CD workflow and required repository/npm secrets.

## [0.1.0] - 2026-03-12

### Added

- Initial public package structure for `@improba/page-builder`.
- Core data model and tree/registry utilities for JSON-driven page rendering.
- Read mode renderer and edit mode foundation with component registry integration.
- Built-in component set and Vue plugin integration.
- Unit/integration test setup, Docker-based developer workflow, and TypeDoc API generation.

[Unreleased]: https://github.com/improba/page-builder/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/improba/page-builder/releases/tag/v0.1.0
