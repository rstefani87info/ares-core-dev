# Documentation `@ares/core-dev`

## Purpose

This folder contains module-level documentation for `@ares/core-dev`: the unified yargs CLI for repeatable scaffolding of projects, datasources, mappers and migrations in the aReS ecosystem.

## Recommended Reading Path

1. **Quickstart & Public CLI** → [core-dev.md](./core-dev.md) § Installation, Quickstart, `ares-core-dev` command tree
2. **API surface / exports** → [core-dev.md](./core-dev.md) § Public APIs (root + `./src/cli.js` + `./presets/mysql.js`)
3. **Driver presets** → "MySQL Preset" chapter (`DRIVER_PRESETS`)
4. **Backward-compat wrappers** → `make-migration.js`, `migrate.js`, `make-mapper.js`
5. **Roadmap / tickets** → `../../tickets/` and `../../tasks/`

## Available Docs

- [core-dev.md](./core-dev.md) — main document (CLI, API, configuration, presets)
- [Completion plan](./completion.md) — module progress checklist

## Note

This is a **dev-side tool**; it is never included by production apps at runtime. It interoperates with `@ares/core` (datasource + migrations runtime) and `@ares/datasource-files` (driver presets).
