# Documentazione @ares/core-dev

## Scopo

`@ares/core-dev` è un set di **CLI unificata yargs** e utility di sviluppo per **generare** e **manutenere** progetti basati su `@ares/core`, con particolare attenzione a:

- bootstrap di un progetto aReS (struttura appSetup + datasources + policies);
- datasource (configurazione + struttura directory via preset driver);
- migrazioni e relativa esecuzione (`migration make` / `migration run`);
- mapper e relativo wiring (`mapper create` / `mapper execute`);
- generazione e revisione della documentazione assistita da AI (`docs generate` / `docs revise`);
- gestione della libreria prompt assistita da AI (`prompt save` / `prompt run`);
- diagnostica dell'integrazione AI (`ai-doctor`);
- delega a `@ares/scd` per generazione prompt/docs/ticket e analisi del codice (`make`, `work ticket`, `analyze code`);
- **preset driver** (attualmente solo MySQL; l'elenco è estendibile via `DRIVER_PRESETS`).

Il modulo nasce come "tooling lato builder/developer" e non viene caricato a runtime dalle applicazioni di produzione: si interfaccia in modo ripetibile con `@ares/datasource-files` e il runtime migrations di `@ares/core`.

## Installazione

Dipendenze dichiarate in `package.json`:

```json
{
  "type": "module",
  "bin": {
    "ares-core-dev": "./index.js"
  },
  "exports": {
    ".": "./src/cli.js",
    "./cli": "./index.js",
    "./presets/mysql": "./presets/mysql.js"
  },
  "dependencies": {
    "@ares/core": "workspace:^",
    "@ares/datasource-files": "workspace:^",
    "@ares/os": "workspace:^",
    "@ares/scd": "workspace:^",
    "yargs": "^17.7.2"
  }
}
```

Nel monorepo Yarn Workspaces:

```bash
yarn workspace <app> add @ares/core-dev --dev
```

Oppure nella root del workspace:

```bash
yarn add -W @ares/core-dev --dev
```

## Quickstart

Workflow completo con la **CLI unificata `ares-core-dev`** (entrypoint unico ESM yargs):

```bash
# 1. Aiuto generale / lista subcommands
ares-core-dev --help

# 2. Bootstrap nuovo progetto aReS
ares-core-dev project init --project-dir ./my-app --project-name my-app

# 3. Aggiungi datasource MySQL al progetto
cd ./my-app
ares-core-dev datasource add --name users --driver mysql --host localhost --port 3306 --user root --password secret --database users

# 4. Elenca datasources presenti
ares-core-dev datasource list --datasource-dir ./datasources

# 5. Crea migration manuale
ares-core-dev migration make --name "Aggiungi colonna telefono" --datasource users

# 6. Esegui migrationi pendenti
ares-core-dev migration run --datasource users --env test --force

# 7. Crea mapper per un datasource
ares-core-dev mapper create --datasource users --name find-by-email --params "email:string:true" --type sql

# 8. Esegui un mapper
ares-core-dev mapper execute users find-by-email --params '{"email":"a@b.c"}'

# 9. Esegui lo script di test del progetto
ares-core-dev test

# 10. Diagnostica AI
ares-core-dev ai-doctor --json
```

## CLI pubbliche (entrypoint unico `ares-core-dev`)

> **Strategia adottata**: Opzione B — singolo entrypoint + subcommands yargs. I vecchi script `make-migration.js`, `migrate.js`, `make-mapper.js` restano come wrapper retrocompatibili.

La CLI è completamente localizzata (`it`/`en`, rilevata automaticamente via `@ares/os`). Usa `--help` su ogni gruppo di comandi per la guida precisa e leggibile.

### `ares-core-dev project init`

Bootstrap di un nuovo progetto aReS con la struttura standard completa:

- `appSetup/` (con `appSetup/index.js`, `appSetup/config/default.js`, `appSetup/policies/default.js`);
- `datasources/`;
- `db/migrations/`;
- `.ares/context/`, `.ares/tasks/`, `.ares/gantt/`, `.ares/docs/it/`, `.ares/docs/en/`.

Parametri (`runProjectInit({ projectDir, projectName, force })`):
- `--project-dir` (string, default `process.cwd()`) — directory di destinazione.
- `--project-name` (string, default: nome directory) — nome logico del progetto.
- `--force, -f` (booleano, default `false`) — sovrascrive file base esistenti (es. `appSetup/index.js`).

### `ares-core-dev datasource add`

Crea un datasource driver-completo via preset (`runDatasourceAdd`).

Parametri:
- `--name, -n` (obbligatorio) — nome del datasource = nome directory.
- `--driver, -d, -drv` (default `mysql`; choices da `SUPPORTED_DRIVERS`, oggi `['mysql']`).
- `--datasource-dir, -D, --root` (default `$ARES_DATASOURCES_ROOT` o `./datasources`).
- Parametri connessione MySQL: `--host`, `--user`, `--password`, `--database, -db`, `--port`, `--schema`.
- `--force, -f` (booleano) — sovrascrive se esiste.

File creati sotto `<ds-root>/<name>/`:
- `datasource.js` (con `aReSInitialize`, ambienti test/production + `autoInstallSchema`);
- `current-schemas.json` (schema generato via preset);
- `migrations/` (directory vuota pronta);
- `queries/` (directory mapper vuota).

### `ares-core-dev datasource list`

Elenca tutte le directory sotto `<datasource-dir>` che contengono `datasource.js` / `index.js`. Nessuna opzione extra.

### `ares-core-dev datasource remove`

Rimuove un datasource esistente (distruttivo).

Parametri:
- `--name, -n` (obbligatorio).
- `--force, -f` (booleano, default `true`).

### `ares-core-dev migration make`

Genera lo scheletro di una migration manuale (`runMakeMigration`).

Obbligatori: `--name, -n`, `--datasource, -d, -ds`.
Opzionali: `--datasource-dir, -D` (default `$ARES_DATASOURCES_ROOT` o `./datasources`).

### `ares-core-dev migration run`

Esegue le migrationi pendenti / rolled-back / fallite tramite `installDatasourceWithMigrations` (`runMigrate`).

Obbligatori: `--datasource, -d, -ds`.
Opzionali:
- `--name, -n` — esegue solo la migration con quel nome/prefisso timestamp;
- `--force, -f` — forza la riesecuzione, bypassando alcuni controlli di sicurezza;
- `--env, -e, --environment` (`test`|`production`|`prod`, default `test`);
- `--datasource-dir, -D`.

Exit code: `0` in caso di successo, `10` se almeno una migration è fallita.

### `ares-core-dev mapper create`

Crea un file `<datasource>/queries/<mapper-name>.js` con template ESM (`runMapperCreate` / `runMakeMapper`).

Parametri:
- `--name, -n` (obbligatorio) — nome query/mapper.
- `--datasource, -d, -ds` (obbligatorio) — datasource proprietario.
- `--params, -p` (obbligatorio) — lista parametri `name:type:required` separata da virgole.
- `--type, -q, --query-type` (obbligatorio; choices `sql|url|json|xml|xsl`).
- `--datasource-dir, -D` (default `./datasources`).

### `ares-core-dev mapper execute <datasource> <mapper>`

Esegue un mapper con parametri da file / URL / JSON inline (`runMapperExecute`).

- Posizionale `<datasource>` — nome datasource (o `--datasource`).
- Posizionale `<mapper>` — nome mapper/query (o `--mapper`).
- `--json, -j, --params` (default `""`) — parametri come percorso `file.json` | URL `http(s)` | JSON inline `'{...}'`.
- `--env, -e, --environment` (`test`|`production`, default `test`).
- `--session-id, -sid` — session id datasource opzionale.

### `ares-core-dev test [scriptName]`

Esegue uno script `package.json` (`runTest`).

- Posizionale `scriptName` (default `"test"`) — nome script package.json.
- `--project-dir` (default `process.cwd()`).

### `ares-core-dev docs generate`

Generazione documentazione assistita da AI (`runDocsGenerate`). Scrive la documentazione in `.ares/docs/<lang>/`.

Parametri (i flag di gruppo `--sample`, `--project-id`, `--json` valgono per tutti i comandi docs/prompt):
- `--scope, -S, --dir` (obbligatorio) — directory da analizzare (es. `./core`).
- `--lang, -l` (`it`|`en`, default `it`).
- `--instructions, -i, --instr` (default `""`) — istruzioni libere aggiuntive per l'AI.
- `--sample, -s`, `--project-id`, `--json, -j`.

### `ares-core-dev docs revise`

Revisione assistita da AI di un singolo file di documentazione (`runDocsRevise`).

- `--file, -f, -F` (obbligatorio) — percorso del file `.md` da rivedere.
- `--lang, -l` (`it`|`en`, default `it`).
- `--instructions, -i, --instr` (default `""`).
- `--sample, -s`, `--project-id`, `--json, -j`.

### `ares-core-dev prompt save`

Salva un prompt ristrutturato in `.prompt/<timestamp>-<slug>.md` (`runPromptSave`).

- `--text, -t` (default `""`) — testo del prompt (può anche arrivare da stdin).
- `--output-dir, -o, --dir` (default `.prompt`).
- `--title-hint, --title` (default `""`).
- `--sample, -s`, `--project-id`, `--json, -j`.

### `ares-core-dev prompt run`

Esegue una capability AI (`runPromptRun`).

- `--text, -t` (default `""`) — testo del prompt (può anche arrivare da stdin).
- `--capability, -c, --cap` (default `answer_question`; choices `answer_question|prompt_refactor|generate_docs|analyze_code|suggest_migrations|scaffold_code|generate_tests|code_refactor`).
- `--force-provider, -p, --provider` (default `null`) — forza un provider (es. `openai`, `anthropic`).
- `--context-json, -ctx` (default `null`) — contesto aggiuntivo in JSON.
- `--session-id, -sid` — session id AI.
- `--sample, -s`, `--project-id`, `--json, -j`.

### `ares-core-dev ai-doctor`

Diagnostica dell'integrazione AI (`runAIDoctor`): verifica disponibilità bridge, sample mode, bridge mode, default prompt dir, comandi docs/prompt e prossimi passi.

- `--sample, -s`, `--json, -j`.

### `ares-core-dev make <command>` (delegato a `@ares/scd`)

Delega a `@ares/scd`:
- `make prompt [--path|-p] [--text|-t] [--output-dir|-o] [--scope|-S] [--title-hint] [--title|-T] [--sample|-s] [--json|-j]`;
- `make docs [--scope|-S] [--lang|-l it|en] [--instructions|-i] [--sample|-s] [--json|-j]`;
- `make ticket [--path|-p] [--text|-t] [--output-dir|-o default .ares/tasks] [--title-hint] [--sample|-s] [--json|-j]`.

### `ares-core-dev work ticket <filename>` (delegato a `@ares/scd`)

Elabora un ticket checklist esistente. Posizionale `<filename>` obbligatorio; `--output|-o`, `--sample|-s`, `--json|-j`.

### `ares-core-dev analyze code` (delegato a `@ares/scd`)

Analizza il codice e genera ticket suggeriti in `.ares/tasks/suggested/`. Opzioni `--scope|-S|--dir` (default cwd), `--max-depth|-d|--depth` (default `3`), `--output|-o`, `--sample|-s`, `--json|-j`.

## API pubbliche (exports)

### Entrypoint root `@ares/core-dev` (package `"."` → `src/cli.js`)

Logica riusabile **senza** side-effect di avvio CLI. Export nominati:

- `DRIVER_PRESETS` (`{ mysql: mysqlPreset }`), `SUPPORTED_DRIVERS` (`['mysql']`);
- `detectLanguage()`, `toSnakeCase()`, `formatTimestamp()`, `resolveDatasourcesRoot()`, `locateDatasourceFile()`;
- `runMakeMapper`, `runMakeMigration`, `runMigrate`, `runProjectInit`, `runDatasourceAdd`, `runDatasourceList`, `runDatasourceRemove`, `runMapperCreate`, `runTest`, `runDocsGenerate`, `runDocsRevise`, `runPromptSave`, `runPromptRun`, `runAIDoctor`, `runMapperExecute`;
- export di default che riespone tutto quanto sopra.

### Subpath `@ares/core-dev/cli` → `index.js`

Entrypoint bin ESM (yargs). Non va importato come libreria (esegue `cli.parseAsync()` al top-level).

### Subpath `@ares/core-dev/presets/mysql`

Export stabili:
- `buildDatasourceModule({ name, host, user, password, database, port })` → stringa sorgente `datasource.js`;
- `buildDefaultSchemasJson({ schemaName })` → oggetto `current-schemas.json`.

## Configurazione / environment

- `$ARES_DATASOURCES_ROOT` — fallback per `--datasource-dir` / `--root` se non passato.
- `isProduction` — determinato da `--env production` → passa al runtime `aReSInitialize`.
- Lingua: `it`/`en` rilevata automaticamente via `@ares/os` `getCurrentOSLanguage()` (default `en`); descrizioni/slogan localizzati inline in `index.js`.
- `DRIVER_PRESETS` (estensione futura): per aggiungere Mongo / Qdrant / Files, modificare `src/cli.js` e aggiungere un file `presets/<driver>.js`.
- I file legacy `localization/languages/{en,it}.js` non sono più usati dalla CLI.

## Wrapper retrocompatibilità (CJS → ESM)

Per non rompere script esistenti, questi file nella root del package sono mantenuti:

| Script | Funzione |
|---|---|
| `make-mapper.js`     | CJS → `import('./src/cli.js').then(m => m.runMakeMapper(parseCli()))` |
| `make-migration.js`  | CJS → `child_process.spawn('node ./index.js migration make …')` con stdio inherit |
| `migrate.js`         | CJS → `child_process.spawn('node ./index.js migration run …')` con stdio inherit |

## Test

```bash
yarn workspace @ares/core-dev test
ares-core-dev test
```

## Note

- Convenzione bin: `ares-core-dev` (lineare, kebab-case).
- Solo MySQL come driver attualmente implementato (altri driver sono pianificati via ticket).
- I comandi `docs`/`prompt`/`ai-doctor` usano il bridge AI (`@ares/ai-3rd-party`); `--sample` li esegue in modalità offline/stub.
- `make`, `work ticket` e `analyze code` sono ereditati da `@ares/scd` (import dinamico o subprocess).
- Vedi Note Operative Fasi 1–2 nel report `../../application-managing-report.md` per integrazione con `dev-test-server` e job runner ibrido.
