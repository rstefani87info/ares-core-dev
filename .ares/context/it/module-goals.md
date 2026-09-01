# @ares/core-dev — Scopo, obiettivi e responsabilità

## Introduzione

`@ares/core-dev` è il **CLI e set di strumenti di scaffolding** per progetti basati su `@ares/core` ("Command line automation for aReS fast programming"). Fornisce un entrypoint CLI unificato (yargs) per generare e manutenere in modo ripetibile progetti, datasource, mapper e migrazioni dell'ecosistema aReS.

È **tooling lato builder/developer**: non viene caricato a runtime dalle applicazioni di produzione.

## Obiettivi

- Bootstrap di un progetto aReS (struttura `appSetup` + `datasources` + policies + `.ares/`).
- Gestione datasource: configurazione e struttura directory via preset driver.
- Gestione migrazioni (`migration make` / `migration run`) con ledger `ares_db_migrations`.
- Gestione mapper (`mapper create` / `mapper execute`).
- Generazione/revisione documentazione assistita da AI (`docs generate` / `docs revise`).
- Gestione libreria prompt assistita da AI (`prompt save` / `prompt run`, `make prompt`).
- Diagnostica integrazione AI (`ai-doctor`).
- Delega a `@ares/scd` per prompt/docs/ticket e analisi codice (`make`, `work ticket`, `analyze code`).

## Responsabilità principali

- **CLI unificata `ares-core-dev`** (`index.js` + `src/cli.js`): comandi `project`, `datasource`, `migration`, `mapper`, `test`, `docs`, `prompt`, `ai-doctor`, `make`, `work ticket`, `analyze code`, con localizzazione it/en (rilevata via `@ares/os`).
- **Preset driver** (`presets/`): attualmente solo MySQL (`presets/mysql.js`: `buildDatasourceModule`, `buildDefaultSchemasJson`); estensibile via `DRIVER_PRESETS`.
- **API riusabili** (`src/cli.js`): `runProjectInit`, `runDatasourceAdd/List/Remove`, `runMakeMigration`, `runMigrate`, `runMapperCreate`, `runMapperExecute`, `runMakeMapper`, `runTest`, `runDocsGenerate`, `runDocsRevise`, `runPromptSave`, `runPromptRun`, `runAIDoctor`, più helper (`detectLanguage`, `toSnakeCase`, `resolveDatasourcesRoot`, ecc.).
- **Wrapper retrocompatibili** in root: `make-mapper.js`, `make-migration.js`, `migrate.js` (CJS → spawn/import della CLI ESM).

## Cosa il modulo NOTA non fa

- **Non** è incluso a runtime nelle app di produzione: è dev tooling.
- **Non** implementa le ridondanze logiche dei driver dei datasource: genera struttura/config e delega l'esecuzione a `@ares/datasource-files` e al runtime migrations di `@ares/core`.
- Driver supportato oggi: solo MySQL (altri pianificati).

## Note

- Entrypoint: `main: src/cli.js`, `bin: ares-core-dev → index.js`, subpath `@ares/core-dev/presets/mysql`.
- Config/env: `$ARES_DATASOURCES_ROOT` (fallback `--datasource-dir`), lingua auto-da `@ares/os`.
