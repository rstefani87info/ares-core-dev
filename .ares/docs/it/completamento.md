# Piano di completamento @ares/core-dev
> Aggiornato: 2026-08-21

## Stato Attuale

- package.json: package ESM con `exports` root e subpath, bin `ares-core-dev`
- CLI: disponibile come `ares-core-dev` (singolo entrypoint yargs, subcommands)
- test script: `ares-core-dev test` (smoke interno modulo)
- docs: documenti principali IT/EN completi (non placeholder)
- scope: scaffolding progetti aReS, datasource/mapper, migrationi MySQL, preset DRIVER_PRESETS=['mysql']
- wrapper retrocompatibili: `make-migration.js`, `migrate.js`, `make-mapper.js` come CJS→ESM spawn

## Completato in Fase 2

- Implementata CLI unificata yargs (Opzione B): `project init | datasource add/list | migration make/run | mapper create | test`
- Aggiunto preset MySQL (`presets/mysql.js`) con `buildDatasourceModule` + `buildDefaultSchemasJson`
- Sostituiti script legacy con wrapper CJS che spawnano `node index.js <subcmd> --datasource …`
- Introdotta shape di output strutturata + flag `--json` (Opzione A) in allineamento con `@ares/scd`
- Aggiornata documentazione IT/EN con comandi, API pubbliche, configurazione, troubleshooting
- Smoke test CLI: `ares-core-dev --help` exit 0, tutti i subcommands help disponibili

## Lavoro residuo

### Alta Priorita

- Validare `yarn install` nel workspace e popolamento `node_modules` per dipendenze yargs/@ares/*
- Aggiungere test di integrazione per flussi reali: init progetto → add datasource → migration run
- Espandere `DRIVER_PRESETS` con MongoDB e altri driver (attualmente solo MySQL)

### Media Priorita

- Stabilizzare nomi di export pubblici per semver (in `exports` package.json)
- Aggiungere lint/format quando il tooling workspace sarà disponibile
- Espandere esempi per configurazioni multi-datasource

### Bassa Priorita

- Decidere pubblicazione dichiarazioni TypeScript o JSDoc
- Aggiungere cross-reference verso `@ares/scd`, `@ares/dev-test-server`, `@ares/core`
- Introdurre dry-run mode per comandi distruttivi (migration run force)

## Riferimenti

- Documento principale IT: ./core-dev.md
- Documento principale EN: ../en/core-dev.md
- Ticket contratto progetto: ../tickets/20260819-phase2-project-contract.md
- Ticket contratto CLI: ../tickets/20260819-phase2-cli-contract.md
- Ticket workflow datasource: ../tickets/20260819-phase2-workflow-datasource.md
