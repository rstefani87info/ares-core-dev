# @ares/core-dev Documentation

## Purpose

Command line automation for aReS fast programming

## Installation

```bash
yarn add @ares/core-dev
```

In a Yarn Workspaces monorepo:

```bash
yarn workspace <app> add @ares/core-dev
```

## Quickstart

Minimal example:

```js
import * as mod from "@ares/core-dev";
```

## Public API (exports)

This section documents the actual public surface at entrypoint level and main exported symbols.

Root entrypoint:

- `@ares/core-dev`

Main files at package root (indicative):

- `index.js`
- `make-mapper.js`

## Configuration (appSetup / config / policies)

This module may read configuration from `appSetup`, `config`, or `policies` depending on the type. Document the actually consumed keys as you stabilize the contract.

## Test

Run module tests (if present):

```bash
yarn workspace @ares/core-dev test
```

## Notes

- This document is maintained alongside the module tickets.
