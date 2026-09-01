#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliEntry = join(__dirname, "index.js");
const argv = process.argv.slice(2);
const node = process.execPath;

const args = [cliEntry, "migration", "run", ...argv];

const child = spawn(node, args, { stdio: "inherit" });
child.on("error", (e) => {
  console.error("[migrate] wrapper failed", e);
  process.exit(1);
});
child.on("close", (code) => process.exit(code ?? 0));
