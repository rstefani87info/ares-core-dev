# Obiettivi funzionali @ares/core-dev

## Scopo (target)

`@ares/core-dev` deve diventare il tool di riferimento per:

- inizializzare un progetto che usa `@ares/core`;
- generare/gestire **datasource**, **mapper**, directory e file di progetto collegati alla persistenza;
- assistere nella creazione e manutenzione di:
  - `current-schema.json`
  - directory `migrations/` (per ambiente/schema)
  - comandi CLI per `migrate`, `create-db`, `drop-db`, `status`, `diff` (quando definito il contract).

## Dipendenze / moduli da integrare

- `../datasource-files`: punto di partenza naturale per generazione file e schemi lato datasource.
- `../core`: funzioni comuni (path, i18n, versioning, ecc.) quando utili e non ridondanti.
- `../files`: utilità FS se già presenti e stabili (evitare duplicazioni).

## Task principali (proposta)

- [x] 1. Definire un **contract di progetto** (dove vivono datasource, mapper, schema, migrations) e documentarlo.
- [ ] 2. Introdurre una CLI coerente: `ares core-dev <command> ...` (o bin dedicato) e documentarla.
- [ ] 3. Workflow end-to-end: “crea datasource + mapper + schema iniziale + migration 0001”.
- [ ] 4. Compatibilità: supporto esplicito a Yarn Workspaces (workspace root vs package root).
- [ ] 5. Integrazione `@ares/datasource-*` (mysql, mongo, qdrant): generazione config e schemi specifici.

> Nota: il contratto fondativo condiviso è nel ticket `../../tickets/20260819-phase1-dev-tools-foundation-contract.md`.

## Done definition (stabile)

- README e docs (it/en) descrivono almeno un percorso completo di adozione (quickstart).
- Esiste una suite minima di smoke test che valida la generazione dei file e la ripetibilità.
- I comandi CLI sono idempotenti (se rilanciati non corrompono file già generati).
