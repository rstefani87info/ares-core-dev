# @ares/core-dev — Dipendenze aReS

## Dipendenze @ares/* dichiarate

Dal `package.json`:

- `@ares/core` (`workspace:^`) — **dipendenza**.
- `@ares/datasource-files` (`workspace:^`) — **dipendenza**.
- `@ares/os` (`workspace:^`) — **dipendenza**.
- `@ares/scd` (`workspace:^`) — **dipendenza**.

### Perché `@ares/core`

È il framework su cui si basano i progetti generati e il runtime a cui core-dev si interfaccia per la parte datasource e migrazioni. In particolare core-dev genera/gestisce la struttura consumata poi a runtime da `@ares/core` (bootstrap `aReSInitialize`, istanza `aReS.include(...)`, runtime datasource/migrations `installDatasourceWithMigrations`), vedi `runMigrate`.

### Perché `@ares/datasource-files`

`@ares/datasource-files` è il driver per datasource filesystem su cui core-dev si appoggia per la gestione ripetibile dei datasource (configurazione + struttura directory via preset). È citato nella documentazione come partner operativo del tooling lato builder.

### Perché `@ares/os`

`@ares/os` fornisce `getCurrentOSLanguage()` usato da core-dev per rilevare la lingua (it/en) della CLI (funzione `detectLanguage()` in `src/cli.js`).

### Perché `@ares/scd`

`@ares/scd` fornisce gli strumenti di analisi di progetto/contesto e i comandi `project:*`. Core-dev lo usa come **bridge lazy** per i comandi ereditati `make prompt/docs/ticket`, `work ticket` e `analyze code`. Nota: pur essendo dichiarato in `package.json`, il bridge è resiliente — se SCD non è disponibile usa lo spawn di `ares-scd` e, in ultima istanza, un messaggio di istruzioni.

## Chi dipende da @ares/core-dev

Dall'analisi delle `package.json` del workspace, dichiarano una dipendenza da `@ares/core-dev`:

- `@ares/datasource-mongo`, `@ares/datasource-mysql`, `@ares/datasource-qdrant`
- `@ares/dev-test-server`
- `@ares/ecosystem-microservices-geo`
- `@ares/language-interpreter`
- `@ares/opendata-digester`
- `@ares/project-manager`
- `@ares/sql`
- `@ares/standard-protocol-io`

Questi moduli (soprattutto i datasource driver e i tooling server) usano `@ares/core-dev` come CLI/strumento di scaffolding verso `@ares/core`.

## Note

- Dependency non-aReS: `yargs` per la CLI.
- Comportamento `@ares/scd` "lazy": il modulo dichiara la dipendenza, ma esegue il bridge via dynamic import/subprocess senza crash se non disponibile.
