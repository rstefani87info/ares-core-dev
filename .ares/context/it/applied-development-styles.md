# @ares/core-dev — Standard di sviluppo e contratto directory

## Standard di stile del codice

- **ESM puro**: `package.json` ha `"type": "module"`.
- **CLI yargs unificata**: un singolo entrypoint `index.js` (bin `ares-core-dev`) con subcommand groups; la logica riusabile vive in `src/cli.js` (nessun side-effect di avvio al top-level).
- **Localizzazione it/en inline**: le stringhe CLI sono contenute in `langStrings(lang)` dentro `index.js` (i vecchi file `localization/languages/*.js` non sono più usati).
- **Bridge lazy verso `@ares/scd`**: `make`, `work ticket` e `analyze code` usano dynamic import del cli SCD o spawn del binario `ares-scd`; core-dev **non** dichiara `@ares/scd` come dipendenza hard, pur usandolo quando disponibile.
- **Wrappers retrocompatibili**: `make-mapper.js`, `make-migration.js`, `migrate.js` (root) delegano alla CLI ESM.

## Alberatura reale del modulo

```
core-dev/
├─ .ares/                       # contesto, docs (en/it), tasks — MANUALE
│  ├─ context/                  # README.md (+ context/it/)
│  ├─ docs/en, docs/it          # core-dev.md, completamento
│  └─ tasks/                    # ticket/checklist (contratti Fase 2, ecc.)
├─ .git/, .gitignore            # GENERATO (vcs) / MANUALE
├─ .tmp/                        # GENERATO — output temporanei (documenti .md di prova)
├─ .tmp-core-dev-prompt/        # GENERATO — prompt di prova temporanei
├─ actions/                     # MANUALE — azioni/routine del tool
├─ localization/                # MANUALE — vecchi file lingue (non più usati dalla CLI)
├─ node_modules/                # GENERATO (yarn install)
├─ presets/                     # MANUALE — preset driver
│  └─ mysql.js                  #   buildDatasourceModule, buildDefaultSchemasJson
├─ src/                         # MANUALE — logica riusabile
│  └─ cli.js                    #   + runtime per project/datasource/migration/mapper/docs/prompt/ai
├─ index.js                     # MANUALE — entrypoint bin ESM (yargs)
├─ make-mapper.js               # MANUALE — wrapper retrocompatibile
├─ make-migration.js            # MANUALE — wrapper retrocompatibile (migration make)
├─ migrate.js                   # MANUALE — wrapper retrocompatibile (migration run)
├─ package.json                 # MANUALE
└─ README.md                    # MANUALE
```

## Alberatura generata nei progetti (`project init` / `datasource add`)

```
<progetto>/
├─ appSetup/                    # GENERATO (scheletro) → poi MANUALE
│  ├─ index.js
│  ├─ config/default.js
│  └─ policies/default.js
├─ datasources/                 # GENERATO (scheletro) → poi MANUALE
│  └─ <name>/
│     ├─ datasource.js          # GENERATO (via preset mysql)
│     ├─ current-schemas.json   # GENERATO (schema preset) → poi MANUALE/manutenuto
│     ├─ migrations/            # MANUALE — migrazioni scritte a mano
│     └─ queries/               # MANUALE — mapper scritti a mano (mapper create genera stub)
├─ db/migrations/               # GENERATO (dir) → MANUALE
├─ .ares/context, .ares/tasks, .ares/gantt, .ares/docs/it|en   # GENERATO (dir) → MANUALE
├─ build/, dist/                # GENERATO — output build (se presenti)
└─ package.json                 # GENERATO (stub)
```

## Distinzione GENERATO vs MANUALE

### Generato automaticamente (non va committato a mano)

- `node_modules/`, `.git/` — installazione e vcs.
- Directory temporanee del dev tool: `.tmp/`, `.tmp-core-dev-prompt/`.
- Nello scaffolding: gli **scheletri** (dir vuote, `datasource.js`/`current-schemas.json` da preset, stub JSON) generati da `project init` e `datasource add`.
- `build/`, `dist/`, `current-schemas.json` (rigenerabile da schema) sono artefatti rigenerabili.

### Manuale (scritto a mano, NON rigenerare/sovrascrivere)

- `src/cli.js`, `index.js`, `presets/`, `actions/`, `localization/` e i wrapper (root).
- `package.json`, `README.md`, `.gitignore`.
- `.ares/context/`, `.ares/docs/`, `.ares/tasks/` — documentazione e ticket.
- Nei progetti: le **migrazioni** (`migrations/`), i **mapper** (`queries/`), i **contenuti** di `appSetup`/config/policies e i file autoriali (dopo lo scaffold iniziale) sono scritti e mantenuti a mano e non devono essere rigenerati.

### Regola operativa

Lo scaffolder crea solo lo scheletro; qualsiasi file generato che rappresenta lavoro autoriale (migrazione, mapper, config applicativa, docs di contesto) deve essere trattato come manuale dopo la creazione. Non sovrascrivere tali file senza esplicita richiesta (`--force`).
