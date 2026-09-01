# @ares/core-dev — Panoramica CLI

## Entrypoint binario

- `ares-core-dev` → `./index.js` (yargs, main `src/cli.js`).

Script npm: `ares-core-dev` (alias bin).

## Comandi principali (yargs, unificato)

Flag comuni a molti gruppi: `-j, --json`, `--sample/-s` (modalità AI offline/stub), `--project-id`.

### `project init`

Bootstrap di un progetto aReS (struttura `appSetup`, `datasources`, `db/migrations`, `.ares/`).
`--project-dir` (default cwd), `--project-name`, `--force/-f`.

### `datasource <command>`

Opzione di gruppo: `--datasource-dir/-D/--root` (default `$ARES_DATASOURCES_ROOT` o `./datasources`).

- `add` — crea un datasource da preset. `--name/-n` (obbl.), `--driver/-d/--drv` (default `mysql`), `--host`, `--user`, `--password`, `--database/-db`, `--port`, `--schema`, `--force/-f`.
- `list` — elenca i datasource rilevati.
- `remove` — rimuove un datasource (distruttivo). `--name/-n`, `--force/-f` (default true).

### `migration <command>`

Opzioni di gruppo: `--datasource/-d/--ds`, `--datasource-dir/-D/--root`.

- `make` — crea una migration manuale. `--name/-n` (obbl.), `--datasource` (obbl.).
- `run` — esegue migrazioni pendenti/rolled_back/failed. `--datasource` (obbl.), `--name/-n`, `--force/-f`, `--env/-e/--environment` (`test|production|prod`, default `test`). Exit code `10` se almeno una fallisce.

### `mapper <command>`

Opzione di gruppo: `--datasource-dir/-D/--root`.

- `create` — crea coppia query + `.js`. `--name/-n`, `--datasource`, `--params/-p` (`name:type:required`, CSV), `--type/-q/--query-type` (`sql|url|json|xml|xsl`).
- `execute <datasource> <mapper>` — esegue un mapper. `--json/-j/--params` (file.json | URL | JSON inline), `--env/-e` (`test|production`, default `test`), `--session-id/-sid`.

### `test [scriptName]`

Esegue uno script `package.json`. Posizionale `scriptName` (default `test`), `--project-dir`.

### `docs <command>`

- `generate` — genera docs AI in `.ares/docs/<lang>/`. `--scope/-S/--dir` (obbl.), `--lang/-l` (it|en, default it), `--instructions/-i`.
- `revise` — revisiona un file `.md`. `--file/-f/-F` (obbl.), `--lang/-l`, `--instructions/-i`.

### `prompt <command>`

- `save` — salva prompt in `.prompt/<timestamp>-<slug>.md`. `--text/-t`, `--output-dir/-o/--dir` (default `.prompt`), `--title-hint/--title`.
- `run` — esegue una capability AI. `--text/-t`, `--capability/-c/--cap` (default `answer_question`; choices includono `prompt_refactor`, `generate_docs`, `analyze_code`, `suggest_migrations`, `scaffold_code`, `generate_tests`, `code_refactor`), `--force-provider/-p/--provider`, `--context-json/-ctx`, `--session-id/-sid`.

### `ai-doctor`

Diagnostica integrazione AI. `--sample/-s`, `--json/-j`.

### Comandi ereditati da `@ares/scd` (bridge)

- `make prompt|docs|ticket` — delega generazione prompt/docs/ticket via AI.
- `work ticket <filename>` — elabora un ticket checklist esistente.
- `analyze code` — analizza codice e genera ticket suggeriti in `.ares/tasks/suggested/`. `--scope/-S/--dir`, `--max-depth/-d/--depth` (default 3), `--output/-o`.

## Wrapper retrocompatibili (root)

- `make-mapper.js` — delega a `mapper create` (via import CJS).
- `make-migration.js` — `node index.js migration make …`.
- `migrate.js` — `node index.js migration run …`.

## Consumo come libreria

`@ares/core-dev` (subpath `.` → `src/cli.js`) espone `run*` functions e `DRIVER_PRESETS`/`SUPPORTED_DRIVERS` senza side-effect CLI; subpath `@ares/core-dev/presets/mysql`.
