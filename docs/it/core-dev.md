# Documentazione @ares/core-dev

## Scopo

Command line automation for aReS fast programming

## Installazione

```bash
yarn add @ares/core-dev
```

In un monorepo Yarn Workspaces:

```bash
yarn workspace <app> add @ares/core-dev
```

## Quickstart

Esempio minimale:

```js
import * as mod from "@ares/core-dev";
```

## API pubbliche (exports)

Questa sezione documenta la superficie pubblica reale a livello di entrypoint e simboli principali.

Entrypoint root:

- `@ares/core-dev`

File principali nel root del package (indicativi):

- `index.js`
- `make-mapper.js`

## Configurazione (appSetup / config / policies)

Questo modulo può leggere configurazioni da `appSetup`, `config` o `policies` a seconda del tipo. Documenta qui le chiavi effettivamente consumate quando stabilizzi il contract.

## Test

Esecuzione test del modulo (se presenti):

```bash
yarn workspace @ares/core-dev test
```

## Note

- Questo documento è mantenuto in parallelo ai ticket del modulo.
