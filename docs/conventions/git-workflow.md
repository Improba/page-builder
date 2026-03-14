# Git Workflow

This document describes the Git conventions, branching strategy, and CI requirements for the
`@improba/page-builder` project.

## Commit Messages

The project follows the [Conventional Commits](https://www.conventionalcommits.org/)
specification. Every commit message must have the format:

```
<type>: <description>
```

For scoped changes:

```
<type>(<scope>): <description>
```

### Types

| Type       | When to use                                                    |
| ---------- | -------------------------------------------------------------- |
| `feat`     | A new feature or capability.                                    |
| `fix`      | A bug fix.                                                      |
| `docs`     | Documentation-only changes.                                     |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature. |
| `test`     | Adding or updating tests.                                       |
| `chore`    | Tooling, CI, dependency updates, or other maintenance.          |
| `style`    | Code formatting changes (whitespace, semicolons, etc.).         |
| `perf`     | Performance improvements.                                       |

### Scope

The scope is optional and identifies the area of the codebase affected:

- `core` -- `src/core/` (tree.ts, registry.ts)
- `types` -- `src/types/`
- `editor` -- `src/components/editor/`
- `reader` -- `src/components/reader/`
- `composables` -- `src/composables/`
- `built-in` -- `src/built-in/`
- `plugin` -- `src/plugin.ts`
- `build` -- vite.config.ts, tsconfig.json, package.json

### Examples

```
feat(editor): add viewport switching to toolbar
fix(core): prevent duplicate IDs when duplicating nested nodes
docs: add rendering pipeline architecture doc
refactor(composables): extract snapshot logic from usePageBuilder
test(core): add tests for interpolateProps with missing variables
chore(build): update vite to 6.1
```

### Body and footer

For non-trivial changes, add a body separated by a blank line:

```
feat(editor): add drag-and-drop from component palette

Implements the palette-to-canvas drag flow using useDragDrop composable.
New components are created with default props on drop.
```

Breaking changes must include a `BREAKING CHANGE:` footer:

```
refactor(types)!: rename IPagePayload to IPageData

BREAKING CHANGE: IPagePayload is now IPageData. Update all imports.
```

## Branch Naming

Branches follow a `<type>/<short-description>` convention using kebab-case:

| Pattern            | Example                                  |
| ------------------ | ---------------------------------------- |
| `feature/<name>`   | `feature/drag-drop-reorder`              |
| `fix/<name>`       | `fix/duplicate-node-id-collision`        |
| `docs/<name>`      | `docs/architecture-overview`             |
| `refactor/<name>`  | `refactor/extract-slot-grouping`         |
| `test/<name>`      | `test/node-tree-composable`              |
| `chore/<name>`     | `chore/update-dependencies`              |

Keep descriptions short (2-4 words) and descriptive.

## Branch Strategy

- **`main`** -- The production-ready branch. Always in a releasable state.
- **Feature branches** -- Created from `main`. Merged back via pull request.
- **No direct commits to `main`** -- All changes go through a pull request.

### Workflow

1. Create a branch from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b feature/my-feature
   ```

2. Make commits following the conventional commits format.

3. Push and open a pull request:
   ```bash
   git push -u origin feature/my-feature
   ```

4. Ensure CI passes (see below).

5. Request review if applicable.

6. Merge via squash-and-merge (preferred) or merge commit.

7. Delete the branch after merge.

## Pull Requests

### PR title

The PR title should follow the same conventional commits format as individual commits, since
squash-merge uses the PR title as the final commit message:

```
feat(editor): add undo/redo keyboard shortcuts
```

### PR description

Include:

- A summary of what changed and why.
- Any notable implementation decisions.
- How to test the changes.
- Screenshots for UI changes.

## CI Requirements

All pull requests must pass the following checks before merge:

### 1. Lint

```bash
docker compose -f docker/docker-compose.yml run --rm dev npm run lint
```

ESLint checks TypeScript and Vue files for code quality and style issues.

### 2. Type check

```bash
docker compose -f docker/docker-compose.yml run --rm dev npm run typecheck
```

`vue-tsc --noEmit` verifies that the entire codebase type-checks without errors.

### 3. Tests

```bash
docker compose -f docker/docker-compose.yml run --rm test
```

Vitest runs all unit and integration tests. Tests must pass with zero failures.

### All three checks must pass

A PR cannot be merged if any of lint, typecheck, or test fails. Fix all issues before
requesting review.

## Releases

Releases are **tag-based**. Pushing a tag of the form `release-vX.Y.Z` triggers the CI to run the quality gate and publish the package to npm.

### Tag format

Tags must follow: **`release-vX.Y.Z`** (e.g. `release-v0.1.0`, `release-v1.2.3`).

### Creating a release (script)

Use the release script to bump the version, commit, create the tag, and push. From the repo root:

```bash
# Bump patch (default): 0.1.0 → 0.1.1
./scripts/release.sh
# or explicitly:
./scripts/release.sh patch

# Bump minor: 0.1.1 → 0.2.0
./scripts/release.sh minor

# Bump major: 0.2.0 → 1.0.0
./scripts/release.sh major
```

Or via npm (e.g. in Docker):

```bash
npm run release -- [major|minor|patch]
```

**What the script does:**

1. Checks that the working tree is clean.
2. Bumps the version in `package.json` and `package-lock.json` (major/minor/patch).
3. Commits with message `chore(release): release-vX.Y.Z`.
4. Creates the tag `release-vX.Y.Z`.
5. Pushes the current branch and the tag.

**Requirements:** run from repository root, on the branch you want to release from (typically `main`). Commit or stash any uncommitted changes first.

### What happens after you push the tag

1. The **Release** workflow runs (trigger: push to tag `release-v*`).
2. **Release quality gate:** checkout tag, `npm ci`, `npm run release:prepare`, `npm run release:dry-run`.
3. **Publish npm:** (only when the trigger is a tag push) same checks again, then `npm publish` to the public registry (requires `NPM_TOKEN` secret).

Triggering the workflow manually via **workflow_dispatch** runs only the quality gate (useful to verify `main`); it does not publish to npm.

### Publish safety checks

`prepublishOnly` (and thus `release:prepare`) runs:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run build:types`
- `npm run docs:api`

### Required secrets

- `NPM_TOKEN`: npm automation token with publish permission on `@improba/page-builder`.

### Local dry run (Docker)

To validate the package without publishing:

```bash
docker compose -f docker/docker-compose.yml run --rm dev npm run release:prepare
docker compose -f docker/docker-compose.yml run --rm dev npm run release:dry-run
```
