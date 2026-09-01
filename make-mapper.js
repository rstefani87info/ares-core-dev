#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runMakeMapper } from "./src/cli.js";

const argv = await yargs(hideBin(process.argv))
  .option("name", {
    alias: "n",
    description: "Name of the query",
    type: "string",
    demandOption: true,
  })
  .option("datasourceConfig", {
    alias: "d",
    description: "Datasource config name",
    type: "string",
    demandOption: true,
  })
  .option("params", {
    alias: "p",
    description: "Parameters in the format name:type:required",
    type: "string",
    demandOption: true,
  })
  .option("queryType", {
    alias: "q",
    description: "Query type (sql|url|json|xml|xsl)",
    type: "string",
    choices: ["sql", "url", "json", "xml", "xsl"],
    demandOption: true,
  })
  .strict()
  .help()
  .parseAsync();

runMakeMapper({
  queryName: argv.name,
  configName: argv.datasourceConfig,
  paramsArg: argv.params,
  queryType: argv.queryType,
  targetDir: process.cwd(),
}).catch((err) => {
  console.error("[make-mapper] Fatal error\n", err);
  process.exit(1);
});
