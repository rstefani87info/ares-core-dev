# Fase 2 – contratto CLI @ares/core-dev (ticket)

## Stato attuale

Il package espone un entrypoint generico (`index.js`) e una utility storica (`make-mapper.js`), ma non una CLI pubblica coerente con gli altri dev tools.

## Convenzione target

Binario pubblico atteso:

```bash
ares-core-dev
```

Forma comandi preferita:

```bash
ares-core-dev <area> <command> [options]
```

## Aree minime

### `project`

```bash
ares-core-dev project init
ares-core-dev project inspect
```

### `datasource`

```bash
ares-core-dev datasource add
ares-core-dev datasource inspect
ares-core-dev datasource current-schemas
```

### `mapper`

```bash
ares-core-dev mapper create
ares-core-dev mapper refresh
```

### `migrations`

```bash
ares-core-dev migrations create
ares-core-dev migrations apply
ares-core-dev migrations status
ares-core-dev migrations diff
```

## Regole di naming

- primo termine = dominio (`project`, `datasource`, `mapper`, `migrations`);
- secondo termine = verbo esplicito (`init`, `add`, `create`, `apply`, `status`, `diff`);
- evitare alias oscuri o entrypoint ambigui.

## Output atteso

Ogni comando produce almeno:

- esito (`ok`, `warning`, `error`);
- oggetto/percorso coinvolto;
- file creati/aggiornati;
- prossimi passi suggeriti.

Quando serve integrazione server/IDE: output serializzabile in JSON.

## Nice to have

### Contratti da estrarre

- `CliCommandDescriptor` comune ai dev tools (CLI e IDE non si disallineano);
- `CliJsonOutputContract` condiviso per output machine-friendly;
- registry alias legacy separato (compatibilità esplicita).

### Dipendenze aReS da valutare

- `@ares/core` per tipi di risultato/error mapping;
- `@ares/files` per risoluzione root progetto e path;
- possibile `@ares/cli-kit` se più moduli convergono su CLI comuni.

### Vendor o librerie utili

| Pacchetto | Pagina web | URL git | Comando yarn |
|---|---|---|---|
| `commander` | https://www.npmjs.com/package/commander | https://github.com/tj/commander.js | `yarn add commander` |
| `yargs` | https://www.npmjs.com/package/yargs | https://github.com/yargs/yargs | `yarn add yargs` |
| `cac` | https://www.npmjs.com/package/cac | https://github.com/cacjs/cac | `yarn add cac` |
| `enquirer` | https://www.npmjs.com/package/enquirer | https://github.com/enquirer/enquirer | `yarn add enquirer` |
| `prompts` | https://www.npmjs.com/package/prompts | https://github.com/terkelg/prompts | `yarn add prompts` |
| `ora` | https://www.npmjs.com/package/ora | https://github.com/sindresorhus/ora | `yarn add ora` |

### Helper e classi utili

- `CommandRegistry`;
- `CommandContextBuilder`;
- `CommandResultFormatter`.
