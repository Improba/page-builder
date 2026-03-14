# AGENTS.md — @improba/page-builder

## Project Overview

Vue 3 page builder component library distributed as an npm package. See [README.md](./README.md) for full project description, usage, and API reference.

## Critical Rules

### Docker-First Development

**ALL dependency management and build operations MUST go through Docker.** Do not run `npm install`, `npm run build`, or `npm run test` directly on the host machine.

```bash
# Install dependencies
docker compose -f docker/docker-compose.yml run --rm dev npm install

# Add a dependency
docker compose -f docker/docker-compose.yml run --rm dev npm install <package>

# Dev server
docker compose -f docker/docker-compose.yml up dev

# Run tests
docker compose -f docker/docker-compose.yml run --rm test

# Build
docker compose -f docker/docker-compose.yml run --rm build
```

**Why?** Ensures consistent Node.js version (22), avoids host-specific issues, and guarantees reproducible builds. The Docker setup uses a bind mount for the project and a named volume for `node_modules` — this means host edits are instantly reflected, but dependencies live in the container.

### Code Editing

Edit source files on the host as normal (they are bind-mounted into the container). Only use Docker for commands that execute Node.js or npm.

## Project Structure

```
src/
├── types/          # TypeScript interfaces (INode, IPageData, IComponentDefinition)
├── core/           # Pure logic (registry.ts, tree.ts) — no Vue dependency
├── composables/    # Vue composables (usePageBuilder, useEditor, useNodeTree, useDragDrop)
├── components/     # Vue components (PageBuilder, reader/, editor/)
├── built-in/       # Built-in page builder components (PbColumn, PbRow, PbText, etc.)
├── plugin.ts       # Vue plugin for app.use()
└── index.ts        # Public API barrel export
```

## Key References

- **Architecture**: [docs/architecture/](./docs/architecture/) — overview, JSON schema, component system, rendering pipeline, edit mode
- **Features**: [docs/features/](./docs/features/) — read mode, edit mode, component registry, JSON format
- **Conventions**: [docs/conventions/](./docs/conventions/) — code style, git workflow
- **Roadmap**: [docs/plans/roadmap.md](./docs/plans/roadmap.md)

## Conventions

- TypeScript strict mode, no `any` unless explicit Vue workaround
- Vue 3 Composition API with `<script setup lang="ts">`
- CSS: scoped styles, `ipb-` BEM prefix, CSS custom properties
- Tests: Vitest + happy-dom, colocated in `tests/`
- Commits: conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`)
