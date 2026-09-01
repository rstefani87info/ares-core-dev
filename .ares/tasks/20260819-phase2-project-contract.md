# Fase 2 – contratto progetto @ares/core-dev (ticket)

## Scopo

Definire la struttura minima che `@ares/core-dev` deve saper creare e mantenere in un progetto basato su aReS.

Questo ticket specializza il contratto fondativo della fase 1 dal punto di vista operativo di `core-dev`.

## Root di progetto

```txt
<project-root>/
  appSetup/
  config/
  policies/
  datasources/
  db/
    migrations/
  docs/
  tickets/
```

## Datasource

Ogni datasource vive in:

```txt
datasources/<datasource-name>/
```

Contenuti minimi:

```txt
datasources/<datasource-name>/
  datasource.js
  current-schemas.json
  migrations/
```

### Ruolo dei file

- `datasource.js`: definizione del datasource, ambienti, driver, estensioni query;
- `current-schemas.json`: fotografia serializzata dello stato schema;
- `migrations/`: artefatti di migrazione legati al datasource (ledger/serializzazione quando serve).

## Mapper e query

Contratto minimo per query/mapper:

```txt
datasources/<datasource-name>/
  <query-name>.sql
  <query-name>.js
```

Alternative ammesse quando previste dal driver: `url`, `json`, `xml`, `xsl`.

## Configurazione

Separazione responsabilità:

- `appSetup/`: topologia, preset, riferimenti tra moduli
- `config/`: path, profili ambiente, opzioni tecniche persistenti
- `policies/`: privacy, permessi, limiti e guardrail

## Yarn Workspaces

Quando il progetto è in monorepo Yarn Workspaces:

- la workspace root resta il riferimento per `appSetup/`, `config/`, `policies`, `docs`, `tickets`;
- `datasources/` può stare in root (condivisione) oppure nel package applicativo (locale).

`@ares/core-dev` deve rendere esplicita questa scelta (flag o config), non dedurla in modo ambiguo.

## Criterio di successo (fase 2)

Un flusso minimo riuscito produce:

- root pronta e coerente;
- almeno un datasource con `datasource.js`;
- `current-schemas.json` presente o generabile;
- `db/migrations/` pronta;
- documentazione minima del progetto aggiornata o creata.

## Nice to have

### Contratti da estrarre

- `ProjectTemplateContract` condiviso (template/preset non impliciti nel codice);
- `DatasourceLayoutContract` separato da `core-dev` se altri moduli dovranno generare/ispezionare datasource;
- convenzione esplicita `workspace-root` vs `package-root` da mantenere nel contratto fondativo, non solo in `core-dev`.

### Dipendenze aReS da valutare

- `@ares/files` per operazioni idempotenti di scaffolding;
- `@ares/core` per descriptor e metadata;
- `@ares/datasource-files` come sede naturale per evitare duplicazione di logica schema/migrations.

### Vendor o librerie utili

| Pacchetto | Pagina web | URL git | Comando yarn |
|---|---|---|---|
| `fs-extra` | https://www.npmjs.com/package/fs-extra | https://github.com/jprichardson/node-fs-extra | `yarn add fs-extra` |
| `globby` | https://www.npmjs.com/package/globby | https://github.com/sindresorhus/globby | `yarn add globby` |
| `memfs` | https://www.npmjs.com/package/memfs | https://github.com/streamich/memfs | `yarn add memfs` |

### Helper e classi utili

- `ProjectScaffoldPlanner` (piano file prima di scrivere);
- `WorkspaceTopologyInspector` (app singola vs monorepo);
- `DatasourcePathResolver` (regole path datasource centralizzate).

## Backlog ereditato (ex checklist 2026-05-06)

- [ ] 1. Rafforzare esempi d’uso reali (quickstart) e casi d’uso
- [ ] 2. Aggiungere/rafforzare smoke test
- [ ] 3. Documentare entrypoint stabili vs opzionali vs transizionali
- [ ] 4. Aggiornare esempi per aderire a import ESM con estensione quando possibile
- [ ] 5. Verificare `exports` (se usato) e compatibilità import ESM/CJS
- [ ] 6. Verificare `main`, `types` e file pubblicati
- [ ] 7. Verificare dipendenze runtime vs devDependencies
- [ ] 8. Dichiarare peerDependencies dove necessario
- [ ] 9. Gestire errori e fallback di configurazione in modo esplicito
- [ ] 10. Evitare side effects non opt-in (logging, IO, network) se possibile
- [ ] 11. Aggiungere/eseguire test (`yarn workspace ... test`)
- [ ] 12. Aggiungere lint/format se previsto dal workspace
- [ ] 13. Completare sezione configurazione con chiavi realmente consumate
- [ ] 14. Aggiungere riferimenti incrociati verso moduli dipendenti (core/web/files, ecc.)
