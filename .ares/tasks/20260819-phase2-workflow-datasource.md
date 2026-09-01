# Fase 2 – workflow datasource @ares/core-dev (ticket)

## Obiettivo

Rendere affidabile il primo workflow end-to-end:

```txt
crea progetto -> aggiungi datasource -> genera mapper/query -> genera current-schemas -> prepara migrations
```

## Sequenza target

### 1) Inizializzazione progetto

Creare/verificare:

- `appSetup/`
- `config/`
- `policies/`
- `datasources/`
- `db/migrations/`
- `docs/`
- `tickets/`

### 2) Creazione datasource

Creare:

- `datasources/<name>/`
- `datasource.js`
- configurazione base driver-specifica (se preset esiste).

### 3) Creazione query/mapper

Per una query/operazione:

- `<query-name>.<ext>`
- `<query-name>.js`

Il mapper documenta parametri, validazione e mapping input.

### 4) Generazione `current-schemas.json`

Quando possibile, delegare o integrare `@ares/datasource-files`.

Se non supportato: motivazione esplicita (no failure opaco).

### 5) Preparazione migrazioni

Preparare:

- `db/migrations/` (progetto)
- `datasources/<name>/migrations/` (datasource)
- convenzioni di naming migrazioni.

## Dipendenze principali

- `@ares/datasource-files` (schema snapshot, migrazioni, serializzazione, ledger)
- `@ares/files` (struttura, path, IO)
- `@ares/core` (descriptor, registry driver, utilità comuni)

## Nice to have

### Contratti da estrarre

- `DatasourcePresetContract` per preset `mysql`/`mongo`/`qdrant`;
- `MapperTemplateContract` per standardizzare i mapper;
- `MigrationNamingContract` riusabile anche da `@ares/scd`.

### Dipendenze aReS da valutare

- `@ares/datasource-files` come fonte primaria (no duplicazioni in `core-dev`);
- `@ares/files` per template expansion e scrittura idempotente;
- `@ares/core` per metadata e driver registry.

### Vendor o librerie utili

| Pacchetto | Pagina web | URL git | Comando yarn |
|---|---|---|---|
| `handlebars` | https://www.npmjs.com/package/handlebars | https://github.com/handlebars-lang/handlebars.js | `yarn add handlebars` |
| `ejs` | https://www.npmjs.com/package/ejs | https://github.com/mde/ejs | `yarn add ejs` |
| `diff` | https://www.npmjs.com/package/diff | https://github.com/kpdecker/jsdiff | `yarn add diff` |
| `jsondiffpatch` | https://www.npmjs.com/package/jsondiffpatch | https://github.com/benjamine/jsondiffpatch | `yarn add jsondiffpatch` |
| `p-limit` | https://www.npmjs.com/package/p-limit | https://github.com/sindresorhus/p-limit | `yarn add p-limit` |

### Helper e classi utili

- `DatasourcePresetResolver`;
- `SchemaSnapshotGenerator`;
- `MigrationBootstrapper`.
