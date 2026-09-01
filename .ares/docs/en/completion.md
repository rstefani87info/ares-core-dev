# Completion Plan @ares/core-dev
> Updated: 2026-08-21

## Current Status

- package.json: ESM package with root and subpath `exports`, bin `ares-core-dev`
- CLI: available as `ares-core-dev` (single yargs entrypoint, subcommands)
- test script: `ares-core-dev test` (internal module smoke)
- docs: main EN/IT docs complete (not placeholder)
- scope: aReS project scaffolding, datasource/mapper, MySQL migrations, preset DRIVER_PRESETS=['mysql']
- legacy wrappers: `make-migration.js`, `migrate.js`, `make-mapper.js` as CJS→ESM spawners

## Completed In Phase 2

- Implemented unified yargs CLI (Option B): `project init | datasource add/list | migration make/run | mapper create | test`
- Added MySQL preset (`presets/mysql.js`) with `buildDatasourceModule` + `buildDefaultSchemasJson`
- Replaced legacy scripts with CJS wrappers that spawn `node index.js <subcmd> --datasource …`
- Introduced structured output shape + `--json` flag (Option A) aligned with `@ares/scd`
- Updated IT/EN docs with commands, public APIs, configuration, troubleshooting
- CLI smoke test: `ares-core-dev --help` exit 0, all subcommand help available

## Remaining Work

### High Priority

- Validate `yarn install` in workspace and `node_modules` population for yargs/@ares/* dependencies
- Add integration tests for real flows: project init → datasource add → migration run
- Expand `DRIVER_PRESETS` with MongoDB and other drivers (currently MySQL only)

### Medium Priority

- Stabilize public export names for semver (in package.json `exports`)
- Add lint/format checks once workspace tooling is available
- Expand examples for multi-datasource configurations

### Low Priority

- Decide on TypeScript declarations vs JSDoc publishing
- Add cross-references to `@ares/scd`, `@ares/dev-test-server`, `@ares/core`
- Introduce dry-run mode for destructive commands (migration run force)

## References

- Main doc EN: ./core-dev.md
- Main doc IT: ../it/core-dev.md
- Project contract ticket: ../tickets/20260819-phase2-project-contract.md
- CLI contract ticket: ../tickets/20260819-phase2-cli-contract.md
- Datasource workflow ticket: ../tickets/20260819-phase2-workflow-datasource.md
