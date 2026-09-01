# Documentazione `@ares/core-dev`

## Scopo

Questa cartella raccoglie la documentazione specifica del modulo `@ares/core-dev`: CLI per lo scaffolding ripetibile di progetti, datasource, mapper e migrazioni in ecosistema aReS.

## Percorso di Lettura Consigliato

1. **Quickstart & CLI pubbliche** → [core-dev.md](./core-dev.md) § Installazione, Quickstart, CLI `ares-core-dev`
2. **Superficie API / exports** → [core-dev.md](./core-dev.md) § API pubbliche + subpath `./src/cli.js`, `./presets/mysql.js`
3. **Preset driver** → capitolo "Preset MySQL" (DRIVER_PRESETS)
4. **Compatibilità retrograda** → wrappers `make-migration.js`, `migrate.js`, `make-mapper.js`
5. **Roadmap / ticket** → `../../tickets/` e `../../tasks/`

## Documenti Disponibili

- [core-dev.md](./core-dev.md) — documento principale (CLI, API, configurazione, preset)
- [Piano di completamento](./completamento.md) — checklist avanzamento modulo

## Nota

Questo modulo è **lato tooling**, non viene incluso a runtime dalle app di produzione. Si interfaccia con `@ares/core` (runtime datasource + migrations) e `@ares/datasource-files` (driver preset).
