import { join, resolve, normalize, relative, basename } from "node:path";
import { fileExists, createDirectory, getFileContent, setFileContentSync, isDirectory, getFiles, isFile, removeDirectory } from "@ares/files";
import { getCurrentOSLanguage } from "@ares/os";
import {
  assembleDatasource,
  loadManualMigrations,
  installDatasourceWithMigrations,
} from "@ares/datasource-files";
import { MIGRATION_STATUS } from "@ares/core/datasources.js";
import aReSInitialize from "@ares/core";
import mysqlPreset from "../presets/mysql.js";

const DEFAULT_DATASOURCES_ROOT_ENVVAR = "ARES_DATASOURCES_ROOT";
const DEFAULT_DATASOURCE_FILENAMES = ["index.js", "datasource.js", "ds.js"];

export const DRIVER_PRESETS = {
  mysql: mysqlPreset,
};

export const SUPPORTED_DRIVERS = Object.keys(DRIVER_PRESETS);

function normalizeOsLanguage(raw) {
  try {
    const lang = String(raw || "")
      .replace(/^([A-Za-z]{2})[-_]?.*$/, "$1")
      .toLowerCase();
    return ["it", "en"].includes(lang) ? lang : "en";
  } catch {
    return "en";
  }
}

export function detectLanguage() {
  return normalizeOsLanguage(getCurrentOSLanguage?.() ?? "en");
}

function fmt(msg, vars = {}) {
  return String(msg || "").replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] === undefined ? `{${k}}` : String(vars[k]),
  );
}

export function toSnakeCase(value) {
  if (typeof value !== "string") return "";
  let out = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"`]/g, "")
    .replace(/([A-Z]+)/g, "_$1")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  out = out.replace(/_+/g, "_");
  return out || "migration";
}

export function formatTimestamp(now = new Date()) {
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

export async function locateDatasourceFile(datasourcesRoot, datasourceName) {
  const candidates = DEFAULT_DATASOURCE_FILENAMES.map((f) =>
    resolve(datasourcesRoot, datasourceName, f),
  );
  candidates.push(resolve(datasourcesRoot, `${datasourceName}.js`));
  for (const p of candidates) {
    try {
      if (fileExists(p) && isFile(p)) return p;
    } catch {}
  }
  return { tried: candidates };
}

export function resolveDatasourcesRoot(explicitDir) {
  const raw = String(explicitDir || "").trim();
  const base = raw || process.env[DEFAULT_DATASOURCES_ROOT_ENVVAR] || resolve(process.cwd(), "datasources");
  return resolve(normalize(base));
}

export async function runMakeMapper({
  queryName,
  configName,
  paramsArg,
  queryType,
  targetDir,
}) {
  const params = String(paramsArg || "")
    .split(",")
    .filter(Boolean)
    .map((part) => {
      const [name, type, required] = part.split(":");
      return { name, type, required: required === "required" };
    });
  const qName = String(queryName).trim();
  const cName = String(configName).trim();
  const qType = String(queryType).trim();
  const target = targetDir || process.cwd();
  const queryFilePath = join(target, `${qName}.${qType}`);
  const jsFilePath = join(target, `${qName}.js`);

  if (!fileExists(queryFilePath)) {
    setFileContentSync(queryFilePath, "");
    console.log(`${queryFilePath} created.`);
  } else {
    console.log(`${queryFilePath} already exists.`);
  }

  if (!fileExists(jsFilePath)) {
    const jsContent = `import { dataDescriptors } from '@ares/core/dataDescriptors.js';
import {findPropValueByAlias} from '@ares/core/objects.js';

const mapper = [
  {
    connectionSetting: '${cName}', 
    validateParameters: function (req,aReS){
      return {
${params.map((param) =>
  `        ${param.name}: {...findPropValueByAlias(dataDescriptors, '${param.type}') , required: ${param.required} }`
).join(",\n")}
      };
    },
    mapParameters: function(req, db) {
      return [
${params.map((param) =>
  `        req.parameters.${param.name}`
).join(",\n")}
      ];
    }
  }
];

export default mapper;
`;
    setFileContentSync(jsFilePath, jsContent);
    console.log(`${jsFilePath} created.`);
  } else {
    console.log(`${jsFilePath} already exists.`);
  }
  return { queryFilePath, jsFilePath };
}

const makeMigrationI18n = {
  it: {
    cli_usage: "Crea una nuova migration manuale per un datasource aReS.",
    ok_created: "Migration creata con successo:",
    err_no_datasource_dir:
      "Impossibile determinare la root dei datasources. Fornire --datasource-dir o impostare ARES_DATASOURCES_ROOT.",
    err_write: "Errore in scrittura:",
    note_edit:
      "Modifica il file esportando la logica nella funzione default(datasource).",
  },
  en: {
    cli_usage: "Create a new manual migration for an aReS datasource.",
    ok_created: "Migration successfully created:",
    err_no_datasource_dir:
      "Unable to locate datasources root. Provide --datasource-dir or set ARES_DATASOURCES_ROOT.",
    err_write: "Write error:",
    note_edit:
      "Edit the file by exporting your logic inside default(datasource).",
  },
};

export async function runMakeMigration({ name, datasource, datasourceDir }) {
  const lang = detectLanguage();
  const t = makeMigrationI18n[lang] || makeMigrationI18n.en;

  const datasourcesRoot = resolveDatasourcesRoot(datasourceDir);
  if (!datasourcesRoot) {
    throw new Error(t.err_no_datasource_dir);
  }
  const nameArg = String(name ?? "").trim();
  const datasourceName = String(datasource ?? "").trim();
  if (!nameArg || !datasourceName) {
    throw new Error("both --name and --datasource are required");
  }

  const snakeName = toSnakeCase(nameArg);
  const timestamp = formatTimestamp();
  const datasourceDirResolved = resolve(datasourcesRoot, datasourceName);
  const migrationsDir = join(datasourceDirResolved, "migrations");
  const fileName = `${timestamp}-${snakeName}.js`;
  const filePath = join(migrationsDir, fileName);

  try {
    createDirectory(migrationsDir, true);
  } catch (err) {
    throw new Error(`${t.err_write} ${migrationsDir}: ${err.message}`);
  }

  const template = `/**
 * aReS manual migration — generated by @ares/core-dev make-migration
 * Datasource: ${datasourceName}
 * Timestamp:  ${timestamp}
 * Name:       ${snakeName}
 *
 * Esporta come default una funzione che riceve \`datasource\` e può
 * modificarne schema/entity/properties/link.
 *
 * Esempio:
 *   export default async function (datasource) {
 *     const schema = datasource.getSchemaDefinition("public");
 *     const user = schema.getEntityDefinition("user");
 *     user.addProperty({ name: "new_column", type: "VARCHAR(255)" });
 *   }
 */
export default async function migration_${snakeName}_${timestamp}(datasource, options) {
  // TODO: edit schema entities, properties, indexes, links here.
  // const schema = datasource.getSchemaDefinitions()[0];
  // const entity = schema.getEntityDefinition("...") || schema.addEntity({ name: "..." });
  // entity.addProperty({ name: "new_column", type: "VARCHAR(255)", nullable: true });
}
`;

  if (fileExists(filePath)) {
    throw new Error(`${t.err_write} ${filePath} (already exists)`);
  }

  try {
    setFileContentSync(filePath, template, "utf8");
  } catch (err) {
    throw new Error(`${t.err_write} ${filePath}: ${err.message}`);
  }

  console.log(`${t.ok_created} ${filePath}`);
  console.log(`${t.note_edit}`);
  return { filePath, fileName, snakeName, timestamp };
}

const migrateI18n = {
  it: {
    header_running: "==> Avvio migrate sul datasource:",
    header_found: "    Migrazioni trovate:",
    header_run: "    In esecuzione:",
    not_found: "[migrate] Nessuna migration pendente trovata.",
    not_found_named: "[migrate] Migration '{name}' non trovata nelle sorgenti o nel datasource.",
    ok_result: "[migrate] OK: {done} migrate completate con successo.",
    warn_partial:
      "[migrate] ATTENZIONE: completate {done}, fallite {failed}, rollbackate {rolled}.",
    err_failed: "[migrate] ERRORE: {failed} migration fallite.",
    err_ds_notfound:
      "[migrate] Impossibile trovare il datasource '{name}'. Percorsi provati:\n{paths}",
    line_result: "      • {name}  [{status}] {info}",
  },
  en: {
    header_running: "==> Starting migrate on datasource:",
    header_found: "    Migrations found:",
    header_run: "    Running:",
    not_found: "[migrate] No pending migrations found.",
    not_found_named:
      "[migrate] Migration '{name}' not found in sources or datasource.",
    ok_result: "[migrate] OK: {done} migration(s) applied successfully.",
    warn_partial:
      "[migrate] WARNING: {done} applied, {failed} failed, {rolled} rolled-back.",
    err_failed: "[migrate] ERROR: {failed} migration(s) failed.",
    err_ds_notfound:
      "[migrate] Could not locate datasource '{name}'. Tried paths:\n{paths}",
    line_result: "      • {name}  [{status}] {info}",
  },
};

function buildMigrationNameMatches(needle, migrationName, fileName = "") {
  const n = String(needle || "").trim();
  if (!n) return false;
  const candidates = [
    migrationName,
    fileName.replace(/\.(js|json)$/i, ""),
    toSnakeCase(migrationName),
    toSnakeCase(fileName),
  ];
  const exact = [n, toSnakeCase(n)];
  if (candidates.some((c) => exact.includes(c))) return true;
  const tsStrip = n.replace(/^[0-9]{14}[-_]?/, "");
  const fileTsStrip = fileName.replace(/\.(js|json)$/i, "").replace(/^[0-9]{14}[-_]?/, "");
  if (
    tsStrip &&
    (tsStrip === fileTsStrip || tsStrip === toSnakeCase(migrationName))
  )
    return true;
  return false;
}

export async function runMigrate({
  datasource,
  name: nameFilterRaw,
  force,
  datasourceDir,
  env,
}) {
  const lang = detectLanguage();
  const t = migrateI18n[lang] || migrateI18n.en;

  const datasourceName = String(datasource ?? "").trim();
  const nameFilter = nameFilterRaw ? String(nameFilterRaw).trim() : null;
  const forceFlag = Boolean(force);
  const isProd =
    String(env || "").toLowerCase() === "production" ||
    String(env || "").toLowerCase() === "prod";
  const datasourcesRoot = resolveDatasourcesRoot(datasourceDir);

  if (!datasourceName) {
    throw new Error("--datasource is required");
  }

  const located = await locateDatasourceFile(datasourcesRoot, datasourceName);
  if (typeof located === "object" && located !== null && located.tried) {
    throw new Error(
      fmt(t.err_ds_notfound, {
        name: datasourceName,
        paths: located.tried.map((p) => `      - ${p}`).join("\n"),
      }),
    );
  }
  const datasourceFile = located;

  const aReS = aReSInitialize(
    { name: datasourceName, config: {}, policies: {} },
    { isProduction: isProd, logEnabled: true },
  );

  const dsInstance = await assembleDatasource(datasourceFile, {
    aReS,
    isProduction: isProd,
    generateCurrentSchemasIfMissing: true,
    autoInstallSchema: false,
  });
  dsInstance.aReS = dsInstance.aReS || aReS;

  const datasourceDirectory = dsInstance.path;

  const autoInstall =
    dsInstance.buildInstallMigrations?.({ includeMigrationsEntity: false }) ??
    [];
  const manual =
    (await loadManualMigrations(datasourceDirectory, dsInstance, {})) ?? [];
  const allMigrations = [...autoInstall, ...manual];

  const selectedMigrations = nameFilter
    ? allMigrations.filter((m) =>
        buildMigrationNameMatches(nameFilter, m.name, m.sourceFileName ?? ""),
      )
    : allMigrations;

  console.log(fmt(t.header_running, {}), datasourceName);
  console.log(fmt(t.header_found, {}), allMigrations.length);
  console.log(
    fmt("{label}: {count}", {
      label: t.header_run,
      count: selectedMigrations.length,
    }),
  );
  if (nameFilter && selectedMigrations.length === 0) {
    throw new Error(fmt(t.not_found_named, { name: nameFilter }));
  }
  if (selectedMigrations.length === 0) {
    console.log(fmt(t.not_found, {}));
    return { results: [], done: 0, failed: 0, rolled: 0, skipped: true };
  }

  const results = await installDatasourceWithMigrations(
    dsInstance,
    datasourceDirectory,
    { migrations: selectedMigrations, loadManualMigrations: false },
  );

  const done = results.filter((r) => r.status === MIGRATION_STATUS.DONE).length;
  const failed = results.filter(
    (r) => r.status === MIGRATION_STATUS.FAILED,
  ).length;
  const rolled = results.filter(
    (r) => r.status === MIGRATION_STATUS.ROLLED_BACK,
  ).length;

  console.log("\n---- Results ----");
  results.forEach((r) => {
    const info = r?.error?.message ?? r?.exception?.message ?? r?.info ?? "";
    console.log(fmt(t.line_result, {
      name: r.migrationName,
      status: r.status,
      info: info ? `(${info})` : "",
    }));
  });

  if (failed === 0 && rolled === 0) {
    console.log(fmt(t.ok_result, { done }));
    return { results, done, failed, rolled, exitCode: 0 };
  }
  if (failed > 0) {
    console.warn(fmt(t.warn_partial, { done, failed, rolled }));
    return { results, done, failed, rolled, exitCode: 10 };
  }
  console.warn(fmt(t.warn_partial, { done, failed, rolled }));
  return { results, done, failed, rolled, exitCode: 0 };
}

const projectInitI18n = {
  it: {
    ok_dir: "Directory progetto creata:",
    ok_file: "Creato:",
    skip: "Già esistente (saltato):",
  },
  en: {
    ok_dir: "Created project directory:",
    ok_file: "Created:",
    skip: "Already exists (skipped):",
  },
};

const ARES_PROJECT_DIRS = [
  "appSetup",
  join("appSetup", "config"),
  join("appSetup", "policies"),
  "datasources",
  join("db", "migrations"),
  join(".ares", "context"),
  join(".ares", "tasks"),
  join(".ares", "gantt"),
  join(".ares", "docs", "it"),
  join(".ares", "docs", "en"),
];

export async function runProjectInit({ projectDir, projectName, force }) {
  const lang = detectLanguage();
  const t = projectInitI18n[lang] || projectInitI18n.en;

  const target = resolve(projectDir || process.cwd());
  const name = projectName || relative(process.cwd(), target) || "ares-project";

  for (const dir of ARES_PROJECT_DIRS) {
    const p = join(target, dir);
    if (!fileExists(p)) {
      createDirectory(p, true);
      console.log(`${t.ok_dir} ${p}`);
    } else {
      console.log(`${t.skip} ${p}`);
    }
  }

  const defaultSetup = `import mainDatasource from './datasources/main/index.js';
export const name = ${JSON.stringify(name)};
export const version = "0.0.1";
export const config = {
  appName: ${JSON.stringify(name)},
};
export const policies = {};
export const datasources = [mainDatasource];
`;
  const setupFile = join(target, "appSetup", "index.js");
  if (force || !fileExists(setupFile)) {
    setFileContentSync(setupFile, defaultSetup, "utf8");
    console.log(`${t.ok_file} ${setupFile}`);
  } else {
    console.log(`${t.skip} ${setupFile}`);
  }

  const configFile = join(target, "appSetup", "config", "default.js");
  if (force || !fileExists(configFile)) {
    setFileContentSync(
      configFile,
      `export default {\n  env: process.env.ARES_ENV || "test",\n};\n`,
      "utf8",
    );
    console.log(`${t.ok_file} ${configFile}`);
  } else {
    console.log(`${t.skip} ${configFile}`);
  }

  const policiesFile = join(target, "appSetup", "policies", "default.js");
  if (force || !fileExists(policiesFile)) {
    setFileContentSync(
      policiesFile,
      `export default {\n  // access policies here\n};\n`,
      "utf8",
    );
    console.log(`${t.ok_file} ${policiesFile}`);
  } else {
    console.log(`${t.skip} ${policiesFile}`);
  }

  return { target, directories: ARES_PROJECT_DIRS, setupFile };
}

const datasourceI18n = {
  it: {
    ds_added: "Datasource creato:",
    ds_exists: "Datasource già esistente (usa --force per sovrascrivere):",
    ds_list_header: "Datasources presenti in {root}:",
    ds_removed: "Datasource rimosso:",
    ds_unknown_driver: "Driver sconosciuto: {driver}. Disponibili: {available}",
    ds_missing_name: "--name è obbligatorio",
  },
  en: {
    ds_added: "Datasource created:",
    ds_exists: "Datasource already exists (use --force to overwrite):",
    ds_list_header: "Datasources found in {root}:",
    ds_removed: "Datasource removed:",
    ds_unknown_driver: "Unknown driver: {driver}. Available: {available}",
    ds_missing_name: "--name is required",
  },
};

export async function runDatasourceAdd({
  name,
  driver = "mysql",
  datasourceDir,
  host,
  user,
  password,
  database,
  port,
  schemaName,
  force,
}) {
  const lang = detectLanguage();
  const t = datasourceI18n[lang] || datasourceI18n.en;

  const dsName = String(name || "").trim();
  if (!dsName) throw new Error(t.ds_missing_name);

  const preset = DRIVER_PRESETS[String(driver || "mysql").toLowerCase()];
  if (!preset) {
    throw new Error(
      fmt(t.ds_unknown_driver, {
        driver,
        available: SUPPORTED_DRIVERS.join(", "),
      }),
    );
  }

  const root = resolveDatasourcesRoot(datasourceDir);
  const targetDir = join(root, dsName);
  if (fileExists(targetDir) && !force) {
    throw new Error(`${t.ds_exists} ${targetDir}`);
  }
  createDirectory(join(targetDir, "migrations"), true);
  createDirectory(join(targetDir, "queries"), true);

  const dsModule =
    typeof preset.buildDatasourceModule === "function"
      ? preset.buildDatasourceModule({
          name: dsName,
          host,
          user,
          password,
          database,
          port,
        })
      : `export const name = ${JSON.stringify(dsName)};\nexport const environments = { test: {}, production: {} };\n`;

  setFileContentSync(join(targetDir, "datasource.js"), dsModule, "utf8");
  const currentSchemas = preset.buildDefaultSchemasJson
    ? preset.buildDefaultSchemasJson({ schemaName: schemaName || database || dsName })
    : { timestamp: Date.now(), schemaDefinitions: [] };
  setFileContentSync(
    join(targetDir, "current-schemas.json"),
    JSON.stringify(currentSchemas, null, 2),
    "utf8",
  );

  console.log(`${t.ds_added} ${targetDir}`);
  return { targetDir, driver: preset.DRIVER_NAME, name: dsName };
}

export async function runDatasourceList({ datasourceDir }) {
  const lang = detectLanguage();
  const t = datasourceI18n[lang] || datasourceI18n.en;
  const root = resolveDatasourcesRoot(datasourceDir);
  console.log(fmt(t.ds_list_header, { root }));
  const out = [];
  if (!fileExists(root)) return out;
  const entries = getFiles(root, /.*/, "d", false);
  for (const entryPath of entries) {
    const entryName = basename(entryPath);
    const dsFile = join(root, entryName, "datasource.js");
    const idxFile = join(root, entryName, "index.js");
    if (fileExists(dsFile) || fileExists(idxFile)) {
      out.push(entryName);
      console.log(`  - ${entryName}`);
    }
  }
  return out;
}

export async function runDatasourceRemove({ name, datasourceDir, force }) {
  const lang = detectLanguage();
  const t = datasourceI18n[lang] || datasourceI18n.en;
  const dsName = String(name || "").trim();
  if (!dsName) throw new Error(t.ds_missing_name);
  const root = resolveDatasourcesRoot(datasourceDir);
  const targetDir = join(root, dsName);
  if (!fileExists(targetDir)) {
    console.log(`${t.ds_removed} nothing (not found): ${targetDir}`);
    return { removed: false, targetDir };
  }
  removeDirectory(targetDir, true);
  console.log(`${t.ds_removed} ${targetDir}`);
  return { removed: true, targetDir };
}

const mapperI18n = {
  it: {
    ok_created: "Mapper creato:",
    missing: "--name --datasource --params --type sono obbligatori",
  },
  en: {
    ok_created: "Mapper created:",
    missing: "--name --datasource --params --type are required",
  },
};

export async function runMapperCreate({
  name,
  datasource,
  params,
  type = "sql",
  datasourceDir,
  force,
}) {
  const lang = detectLanguage();
  const t = mapperI18n[lang] || mapperI18n.en;
  const qName = String(name || "").trim();
  const dsName = String(datasource || "").trim();
  if (!qName || !dsName || !params) {
    throw new Error(t.missing);
  }
  const root = resolveDatasourcesRoot(datasourceDir);
  const targetDir = join(root, dsName, "queries");
  createDirectory(targetDir, true);
  return runMakeMapper({
    queryName: qName,
    configName: dsName,
    paramsArg: params,
    queryType: type,
    targetDir,
  });
}

const testI18n = {
  it: {
    no_script: "Nessun script di test definito in package.json",
    run: "Esecuzione: {cmd} nella directory {cwd}",
  },
  en: {
    no_script: "No test script defined in package.json",
    run: "Running: {cmd} in {cwd}",
  },
};

export async function runTest({ scriptName, projectDir, args }) {
  const lang = detectLanguage();
  const t = testI18n[lang] || testI18n.en;
  const target = resolve(projectDir || process.cwd());
  const pkgFile = join(target, "package.json");
  let testCmd = null;
  if (fileExists(pkgFile)) {
    try {
      const pkg = JSON.parse(getFileContent(pkgFile, "utf8"));
      const scripts = pkg.scripts || {};
      testCmd = scripts[scriptName || "test"];
    } catch {}
  }
  if (!testCmd) {
    console.warn(t.no_script);
    return { code: 0, skipped: true };
  }
  const extra = Array.isArray(args) && args.length ? " " + args.join(" ") : "";
  console.log(fmt(t.run, { cmd: testCmd + extra, cwd: target }));
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    const sh = process.platform === "win32" ? "cmd.exe" : process.env.SHELL || "/bin/sh";
    const shellArgs = process.platform === "win32" ? ["/c", testCmd + extra] : ["-c", testCmd + extra];
    const child = spawn(sh, shellArgs, { cwd: target, stdio: "inherit" });
    child.on("error", (err) => resolve({ code: 1, error: err.message }));
    child.on("close", (code) => resolve({ code: code ?? 0 }));
  });
}

// =================== Integrazione AI bridge ===================
// Approccio: dynamic import @ares/ai-3rd-party (workspace symlink o path relativo)
// Pattern lazy bridge di MCP / F7 core-dev migration bridge.
// Se AI non disponibile → fallback stub restituisce sempre shape coerente ma marked="ai_not_available".

const AI_NOT_AVAILABLE = {
  ok: false,
  ai: { available: false, mode: "stub_core_dev_fallback" },
  error: "@ares/ai-3rd-party non disponibile. Esegui `yarn install` nel workspace aReS oppure usa --sample per modalità offline.",
};

let _aiCached = null;
let _aiCliBootstrapTried = false;
async function loadAIModule({ sample = false, bootstrapCli = true } = {}) {
  if (_aiCached) {
    if (bootstrapCli && !_aiCliBootstrapTried) {
      _aiCliBootstrapTried = true;
      try { if (typeof _aiCached.bootstrapCliProvidersFromConfig === "function") await _aiCached.bootstrapCliProvidersFromConfig(); } catch {}
    }
    return _aiCached;
  }
  let mods = null;
  const searchPaths = [
    () => import("@ares/ai-3rd-party/index.js"),
    () => import("../../ai/ai-3rd-party/index.js"),
    () => import("../ai/ai-3rd-party/index.js"),
    () => import("../../ai-3rd-party/index.js"),
    () => import("../ai-3rd-party/index.js"),
  ];
  for (const loader of searchPaths) {
    try { mods = await loader(); if (mods) break; } catch {}
  }
  if (!mods || !mods.runCapability) {
    if (sample) {
      mods = buildSampleAIStub();
    } else {
      return null;
    }
  }
  _aiCached = mods;
  if (bootstrapCli && !_aiCliBootstrapTried) {
    _aiCliBootstrapTried = true;
    try { if (typeof mods.bootstrapCliProvidersFromConfig === "function") await mods.bootstrapCliProvidersFromConfig(); } catch {}
  }
  return mods;
}

function buildSampleAIStub() {
  // Stub offline locale equivalente al provider sample di F8 (suffciente per CLI test --sample)
  return {
    runCapability: async function (capId, opts = {}) {
      const prompt = String(opts.prompt || opts.text || "");
      const now = Date.now();
      const guardrail = { issues: 0, riskScore: 0, matches: [], redacted: prompt, ok: true };
      if (/[\w.-]+@[\w-]+\.[\w.-]{2,}/.test(prompt)) { guardrail.issues++; guardrail.riskScore += 20; guardrail.matches.push({ type: "email" }); guardrail.redacted = guardrail.redacted.replace(/[\w.-]+@[\w-]+\.[\w.-]{2,}/g, "***REDACTED***"); }
      if (/3\d{2}[.\s-]?\d{3,4}[.\s-]?\d{3}/.test(prompt)) { guardrail.issues++; guardrail.riskScore += 30; guardrail.matches.push({ type: "phone" }); guardrail.redacted = guardrail.redacted.replace(/3\d{2}[.\s-]?\d{3,4}[.\s-]?\d{3}/g, "***REDACTED***"); }
      if (guardrail.riskScore >= 50) guardrail.ok = false;
      const sampleTitles = {
        prompt_refactor: (p) => {
          const cleaned = (p.split(/\r?\n/)[0] || p).replace(/[^\w\s-]/g, "").trim().slice(0, 80) || "prompt-di-lavoro";
          return cleaned.toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        },
      };
      if (capId === "prompt_refactor") {
        const suggested = (sampleTitles.prompt_refactor(prompt));
        const md = buildRestructuredPromptMarkdown(prompt);
        return {
          ok: guardrail.ok,
          capId,
          providerId: "sample_core_dev_stub",
          sample: true,
          sessionId: "stub-" + now,
          tokensIn: prompt.length,
          tokensOut: md.length,
          riskScore: guardrail.riskScore,
          latencyMs: 50,
          guardrail,
          result: { suggested_title: suggested, restructured_markdown: md, title_slug: suggested },
        };
      }
      if (capId === "generate_docs") {
        return {
          ok: true, capId, providerId: "sample_core_dev_stub", sample: true,
          sessionId: "stub-" + now, tokensIn: prompt.length, tokensOut: 1200, riskScore: guardrail.riskScore,
          latencyMs: 40, guardrail,
          result: { files_generated: [".ares/docs/it/index.md",".ares/docs/en/index.md"], summary: "[sample] Documentazione generata in stub. Usare AI reale per contenuti veritieri." },
        };
      }
      return { ok: guardrail.ok, capId, providerId: "sample_core_dev_stub", sample: true, guardrail, result: { raw: guardrail.redacted } };
    },
    chatCompletion: async function (opts = {}) {
      const msgs = Array.isArray(opts.messages) ? opts.messages : [{ role: "user", content: String(opts.prompt || "") }];
      const last = msgs[msgs.length - 1] || { content: "" };
      const prompt = String(last.content || "");
      const run = await this.runCapability("prompt_refactor", { prompt, ...opts });
      if (!run.ok) return { ok:false, messages: msgs, reply: run.error || "blocked" };
      return {
        ok: true, sessionId: run.sessionId, turns: msgs.length,
        reply: JSON.stringify({ suggested_title: run.result.suggested_title, restructured_markdown: run.result.restructured_markdown }, null, 2),
        providerId: run.providerId, tokensOut: run.tokensOut,
      };
    },
  };
}

function buildRestructuredPromptMarkdown(rawPrompt) {
  const lines = String(rawPrompt || "").split(/\r?\n/).filter(Boolean);
  const firstLine = (lines[0] || "Prompt di lavoro").trim().slice(0,120);
  return [
    "# Prompt di lavoro (ristrutturato)",
    "",
    "## Scopo",
    "",
    (lines[0] || firstLine) || "Obiettivo da definire.",
    "",
    "## Dettagli di contesto",
    "",
    ...(lines.slice(1).map((l) => "- " + l).slice(0, 10) || ["- Nessun dettaglio aggiuntivo fornito."]),
    "",
    "## Note operative",
    "",
    "- Prompt in formato markdown strutturato per riesecuzione futura",
    "- Prompt originale accodato in coda come citazione",
    "",
    "## Prompt originale (rif.)",
    "",
    "> " + String(rawPrompt || "").split(/\r?\n/).join("\n> "),
  ].join("\n");
}

function slugifyForFilename(s) {
  return String(s || "prompt")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"`]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "prompt";
}

function formatPromptTimestamp(now = new Date()) {
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function detectScopeFiles(scope) {
  const base = resolve(scope || process.cwd());
  const out = [];
  function walk(dir, depth = 0) {
    if (depth > 3) return;
    let entries = [];
    try { entries = getFiles(dir, /.*/, "*", false); } catch { return; }
    for (const full of entries) {
      const e = basename(full);
      if (e === "node_modules" || e === ".git") continue;
      try {
        if (isDirectory(full)) walk(full, depth + 1);
        else if (/\.(js|ts|jsx|tsx|md|json|ya?ml)$/i.test(e)) out.push(relative(base, full).replace(/\\/g, "/"));
      } catch {}
    }
  }
  try { walk(base); } catch {}
  return out.slice(0, 200);
}

const docsAiI18n = {
  it: {
    scope_empty: "Scope directory non esistente o vuoto.",
    generated: "Generazione documentazione AI conclusa per scope {scope}: {ok} files generati/aggiornati.",
    revise_no_file: "File da revisionare non esistente: {file}",
    revised: "Documentazione revisionata: file {file}.",
  },
  en: {
    scope_empty: "Scope directory does not exist or is empty.",
    generated: "AI docs generation done for scope {scope}: {ok} files generated/updated.",
    revise_no_file: "File to revise does not exist: {file}",
    revised: "Documentation revised: file {file}.",
  },
};

export async function runDocsGenerate({ scope, lang = "it", projectId = "default", sample = false, json = false, instructions = "" }) {
  const uiLang = detectLanguage();
  const t = docsAiI18n[uiLang] || docsAiI18n.en;
  const scopePath = resolve(scope || process.cwd());
  const files = detectScopeFiles(scopePath);
  const ai = await loadAIModule({ sample });
  let result;
  if (!ai) {
    result = { ...AI_NOT_AVAILABLE };
  } else {
    const prompt = [
      `Genera o aggiorna documentazione IT/EN per il modulo/cartella situato in scope: ${scopePath}.`,
      `Lingua doc principale richiesta: ${lang}.`,
      `File presenti (fino a 200): ${files.length}`,
      files.length ? `- Lista file: ${files.slice(0, 60).join(", ")}${files.length > 60 ? " ... (truncated)" : ""}` : "",
      instructions ? `- Istruzioni aggiuntive: ${instructions}` : "",
      `Rispetta lo standard di documentazione aReS: .ares/docs/it e .ares/docs/en con index.md + file nome modulo + completamento/completion.md.`,
    ].filter(Boolean).join("\n");
    result = await ai.runCapability("generate_docs", {
      projectId, prompt, sample, json,
      context: { scope: scopePath, files, lang, type: "docs_generate" },
    });
  }
  const payload = {
    ok: Boolean(result && result.ok !== false),
    scope: scopePath,
    lang,
    filesFound: files.length,
    sample: Boolean(sample || (result && result.sample)),
    providerId: result && result.providerId ? result.providerId : (ai ? "stub" : "ai_unavailable"),
    result: (result && result.result) || null,
    error: result && result.error ? String(result.error) : null,
    guardrail: result && result.guardrail ? { issues: result.guardrail.issues, riskScore: result.guardrail.riskScore, redacted: Boolean(result.guardrail.redacted) } : null,
  };
  if (json) {
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  } else {
    console.log(fmt(t.generated, { scope: scopePath, ok: payload.ok ? "OK" : "FAILED" }));
    if (payload.error) console.warn("⚠ " + payload.error);
    if (payload.result && payload.result.summary) console.log(payload.result.summary);
  }
  return payload;
}

export async function runDocsRevise({ file, instructions = "", lang = "it", projectId = "default", sample = false, json = false }) {
  const uiLang = detectLanguage();
  const t = docsAiI18n[uiLang] || docsAiI18n.en;
  const filePath = resolve(file || process.cwd());
  let existing = null;
  try { existing = fileExists(filePath) && isFile(filePath) ? getFileContent(filePath, "utf8") : null; } catch {}
  if (!existing) {
    const payload = { ok: false, file: filePath, error: fmt(t.revise_no_file, { file: filePath }) };
    if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    else console.error(payload.error);
    return payload;
  }
  const ai = await loadAIModule({ sample });
  let result;
  if (!ai) result = { ...AI_NOT_AVAILABLE };
  else {
    const prompt = [
      `Rivedi e aggiorna la documentazione nel file: ${filePath}`,
      `Lingua principale: ${lang}.`,
      instructions ? `Istruzioni specifiche: ${instructions}` : "Mantieni struttura, migliora leggibilità, allinea alle convenzioni aReS (.ares/docs/it e .ares/docs/en standard), inserisci link clickable se applicabile.",
      `\n==== CONTENUTO ATTUALE DEL FILE ====\n${existing}\n==== FINE CONTENUTO ====`,
    ].join("\n");
    result = await ai.runCapability("generate_docs", {
      projectId, prompt, sample,
      context: { type: "docs_revise", filePath, lang, bytes: existing.length },
    });
  }
  let writtenNew = null;
  if (result && result.ok && result.result && typeof result.result.restructured_markdown === "string") {
    try { setFileContentSync(filePath, result.result.restructured_markdown, "utf8"); writtenNew = filePath; } catch {}
  }
  const payload = {
    ok: Boolean(result && result.ok !== false),
    file: filePath,
    bytesOriginal: existing.length,
    written: writtenNew,
    sample: Boolean(sample || (result && result.sample)),
    providerId: result && result.providerId ? result.providerId : (ai ? "stub" : "ai_unavailable"),
    result: (result && result.result) || null,
    error: result && result.error ? String(result.error) : null,
  };
  if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else console.log(fmt(t.revised, { file: filePath }) + (writtenNew ? " (scritto su file)" : "") + (payload.error ? " ⚠ " + payload.error : ""));
  return payload;
}

const promptAiI18n = {
  it: {
    no_text: "Nessun testo di prompt fornito (usa --text o stdin tramite pipe).",
    saved: "Prompt salvato in: {path} · titolo suggerito da AI: {title}",
    run: "Esecuzione prompt su capability {capId} conclusa: {status}",
    not_available: "Modulo AI non disponibile (vedi istruzioni in application-managing-summary.md §7 o installa il workspace).",
  },
  en: {
    no_text: "No prompt text provided (use --text or pipe stdin).",
    saved: "Prompt saved to: {path} · AI suggested title: {title}",
    run: "Prompt execution on capability {capId} done: {status}",
    not_available: "AI module not available (see instructions in application-managing-summary.md §7 or install the workspace).",
  },
};

async function readStdinAll() {
  if (process.stdin.isTTY) return null;
  return await new Promise((resolve) => {
    let out = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => { out += String(d); });
    process.stdin.on("end", () => resolve(out.trim() || null));
    process.stdin.on("error", () => resolve(null));
    setTimeout(() => resolve(out.trim() || null), 1200);
  });
}

export async function runPromptSave({ text, outputDir = ".ares/prompt", titleHint = "", projectId = "prompt_library", sample = false, json = false }) {
  const uiLang = detectLanguage();
  const t = promptAiI18n[uiLang] || promptAiI18n.en;
  let rawText = String(text || "").trim();
  if (!rawText) rawText = String((await readStdinAll()) || "").trim();
  if (!rawText) {
    const payload = { ok: false, error: t.no_text };
    if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    else console.error(payload.error);
    return payload;
  }
  const now = new Date();
  const ts = formatPromptTimestamp(now);
  const outDir = resolve(outputDir);
  try { createDirectory(outDir, true); } catch {}

  const ai = await loadAIModule({ sample });
  let aiTitle = null;
  let restructured = null;
  let aiRes = null;
  let usedStubFallback = false;
  if (ai) {
    try {
      const aiPrompt = [
        titleHint ? `Titolo suggerito dall'utente: ${titleHint}.` : "Nessun titolo utente, estrai un titolo conciso di max 80 caratteri dal testo.",
        "Restituisci SEMPRE un oggetto JSON con shape ESATTA: {\"suggested_title\": stringa titolo, \"restructured_markdown\": stringa markdown ristrutturato con sezioni ## Scopo ## Dettagli ## Note ## Prompt originale}",
        "\n==== TESTO PROMPT DI INPUT ====\n",
        rawText,
        "\n==== FINE TESTO ====",
      ].join("\n");
      aiRes = await ai.runCapability("prompt_refactor", {
        projectId,
        prompt: aiPrompt,
        sample,
        context: { type: "prompt_save", titleHint, bytes: rawText.length },
      });
      if (aiRes && aiRes.ok && aiRes.result) {
        aiTitle = aiRes.result.suggested_title || aiRes.result.title_slug || null;
        restructured = aiRes.result.restructured_markdown || null;
      } else if (aiRes && aiRes.error) {
        usedStubFallback = true;
      }
    } catch { usedStubFallback = true; }
  }
  if (!aiTitle) {
    aiTitle = slugifyForFilename(titleHint || rawText.split(/\r?\n/)[0] || "prompt");
  }
  if (!restructured) {
    // Fallback offline: struttura markdown minima senza AI
    restructured = [
      "# " + (titleHint || aiTitle || "Prompt di lavoro"),
      "",
      "## Scopo",
      "",
      (rawText.split(/\r?\n/)[0] || "Prompt di lavoro") + ".",
      "",
      "## Dettagli",
      "",
      ...rawText.split(/\r?\n/).slice(1).filter(Boolean).map((l) => "- " + l).slice(0, 30),
      rawText.split(/\r?\n/).length <= 1 ? "- Nessun dettaglio aggiuntivo." : "",
      "",
      "## Note operative",
      "",
      "- AI non disponibile o modalità offline: struttura creata da template core-dev.",
      `- Timestamp di salvataggio: ${ts}`,
      "",
      "## Prompt originale",
      "",
      "> " + rawText.split(/\r?\n/).join("\n> "),
    ].filter((e) => e !== "").join("\n");
  }
  const slugTitle = slugifyForFilename(aiTitle);
  const fileName = `${ts}-${slugTitle}.md`;
  const filePath = join(outDir, fileName);
  try { setFileContentSync(filePath, restructured, "utf8"); } catch (err) {
    const payload = { ok: false, error: `Impossibile scrivere file: ${err.message}` };
    if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    else console.error(payload.error);
    return payload;
  }
  const payload = {
    ok: true,
    saved_path: filePath,
    saved_file_name: fileName,
    saved_dir: outDir,
    timestamp: ts,
    title_evolved_by_ai: aiTitle,
    title_slug: slugTitle,
    raw_bytes: rawText.length,
    restructured_bytes: Buffer.byteLength(restructured, "utf8"),
    ai: ai ? { used: true, providerId: aiRes && aiRes.providerId ? aiRes.providerId : "sample_stub_core_dev", usedStubFallback } : { used: false },
    sample: Boolean(sample),
  };
  if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else console.log(fmt(t.saved, { path: filePath, title: aiTitle }) + (usedStubFallback ? " (fallback template: AI non disponibile)" : ""));
  return payload;
}

export async function runPromptRun({ text, capability = "answer_question", forceProvider, projectId = "prompt_run", sessionId, sample = false, json = false, contextJson }) {
  const uiLang = detectLanguage();
  const t = promptAiI18n[uiLang] || promptAiI18n.en;
  let raw = String(text || "").trim();
  if (!raw) raw = String((await readStdinAll()) || "").trim();
  if (!raw) {
    const payload = { ok: false, error: t.no_text };
    if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    else console.error(payload.error);
    return payload;
  }
  let ctx = null;
  if (contextJson) { try { ctx = JSON.parse(String(contextJson)); } catch { ctx = { raw: contextJson }; } }
  const ai = await loadAIModule({ sample });
  let res;
  if (!ai) res = { ...AI_NOT_AVAILABLE };
  else {
    res = await ai.runCapability(String(capability), {
      projectId, sessionId,
      prompt: raw, forceProvider, sample, json,
      context: ctx || { type: "cli_prompt_run", capability },
    });
  }
  const payload = {
    ok: Boolean(res && res.ok !== false),
    capId: String(capability),
    providerId: res && res.providerId ? res.providerId : (ai ? "stub" : "ai_unavailable"),
    tokensIn: res && res.tokensIn || 0,
    tokensOut: res && res.tokensOut || 0,
    riskScore: res && res.guardrail && typeof res.guardrail.riskScore === "number" ? res.guardrail.riskScore : 0,
    sample: Boolean(sample || (res && res.sample)),
    sessionId: res && res.sessionId || sessionId || null,
    result: (res && res.result) || null,
    error: res && res.error ? String(res.error) : null,
  };
  if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else {
    console.log(fmt(t.run, { capId: payload.capId, status: payload.ok ? "OK" : "FAILED" }));
    if (payload.error) console.warn("⚠ " + payload.error);
    if (payload.result && typeof payload.result === "string") console.log(payload.result);
    else if (payload.result && typeof payload.result === "object") console.log(JSON.stringify(payload.result, null, 2));
  }
  return payload;
}

export async function runAIDoctor({ sample = false, json = false }) {
  const ai = await loadAIModule({ sample });
  const payload = {
    ok: Boolean(ai),
    ai_available: Boolean(ai),
    sample_mode: Boolean(sample),
    bridge: ai ? (ai === _aiCached && ai.runCapability ? "dynamic import ok" : "stub ok") : "NOT available",
    prompt_dir_default: resolve(".ares/prompt"),
    capabilities_bridged: ["generate_docs", "prompt_refactor", "answer_question", "refactor_code", "scaffold", "analyze_project", "suggest_migrations", "generate_tests"],
    docs_commands: ["docs generate", "docs revise"],
    prompt_commands: ["prompt save <-> .prompt/YYYYMMDD-HHmm-<ai-title-slug>.md", "prompt run"],
    next_steps: ai ? [] : [
      "Esegui `yarn install` nella root workspace aReS",
      "Oppure verifica che @ares/ai-3rd-party sia in ares-modules.txt",
      "Per test offline usa --sample (usa stub core-dev di AI se orchestratore non raggiungibile)",
    ],
  };
  if (json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else {
    console.log("AI bridge per core-dev: " + (payload.ok ? "[OK] DISPONIBILE" : "[ERR] NON DISPONIBILE"));
    console.log("  Sample mode:", payload.sample_mode ? "ON (stub/AI offline)" : "OFF");
    console.log("  Bridge mode:", payload.bridge);
    console.log("  Prompt dir default:", payload.prompt_dir_default);
    console.log("  Comandi docs:", payload.docs_commands.join(", "));
    console.log("  Comandi prompt:", payload.prompt_commands.join(", "));
    if (payload.next_steps && payload.next_steps.length) {
      console.warn("\n[WARN] Prossimi passi per abilitare l'AI:");
      payload.next_steps.forEach((s) => console.log("  · " + s));
    }
  }
  return payload;
}

// =================== Comando: mapper execute ===================
// Esegue un mapper di un datasource caricandolo via datasource-files
// e passando parametri da --json=<file|url|inline>

const mapperExecuteI18n = {
  it: {
    missing_ds: "Nome datasource obbligatorio (primo argomento posizionale o --datasource)",
    missing_mapper: "Nome mapper obbligatorio (secondo argomento posizionale o --mapper)",
    missing_ds_file: "Datasource non trovato in root: {path}. Verifica nome o --datasources-root.",
    invalid_json: "Parametro --json non valido: {reason}",
    cannot_fetch: "Impossibile recuperare URL --json: {url}",
    no_query: "Mapper '{mapper}' non trovato nel datasource '{ds}'. Disponibili: {available}",
    executed: "Mapper eseguito: {mapper}@{ds} — righe: {rows}",
    failed: "Mapper fallito: {mapper}@{ds} — errore: {error}",
  },
  en: {
    missing_ds: "Datasource name is required (first positional or --datasource)",
    missing_mapper: "Mapper name is required (second positional or --mapper)",
    missing_ds_file: "Datasource not found under root: {path}. Check name or --datasources-root.",
    invalid_json: "Invalid --json param: {reason}",
    cannot_fetch: "Cannot fetch URL --json: {url}",
    no_query: "Mapper '{mapper}' not found in datasource '{ds}'. Available: {available}",
    executed: "Mapper executed: {mapper}@{ds} — rows: {rows}",
    failed: "Mapper failed: {mapper}@{ds} — error: {error}",
  },
};

async function loadJsonParams(source) {
  if (!source) return {};
  const s = String(source).trim();
  if (!s) return {};
  if (/^https?:\/\//i.test(s)) {
    try {
      const r = await fetch(s, { method: "GET" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      throw new Error(`fetch URL failed: ${e.message}`);
    }
  }
  if (s.startsWith("{") || s.startsWith("[")) {
    try { return JSON.parse(s); } catch (e) { throw new Error(`inline JSON parse: ${e.message}`); }
  }
  const p = resolve(s);
  if (fileExists(p) && isFile(p)) {
    try { return JSON.parse(getFileContent(p, "utf8")); } catch (e) { throw new Error(`file ${p} parse: ${e.message}`); }
  }
  throw new Error(`--json='${s}' is not a file, URL, or inline JSON object`);
}

export async function runMapperExecute({ datasource, mapper, datasourcesRoot, json: jsonParamsOpt, env = "test", sessionId, sample = false, jsonOut = false }) {
  const uiLang = detectLanguage();
  const t = mapperExecuteI18n[uiLang] || mapperExecuteI18n.en;
  const dsName = String(datasource || "").trim();
  const mapperName = String(mapper || "").trim();
  if (!dsName) { const p = { ok: false, error: t.missing_ds }; if (jsonOut) process.stdout.write(JSON.stringify(p, null, 2) + "\n"); else console.error(p.error); return p; }
  if (!mapperName) { const p = { ok: false, error: t.missing_mapper }; if (jsonOut) process.stdout.write(JSON.stringify(p, null, 2) + "\n"); else console.error(p.error); return p; }

  const root = resolveDatasourcesRootFromOpt(datasourcesRoot);
  const dsCandidates = DEFAULT_DATASOURCE_FILENAMES.map((f) => join(root, dsName, f));
  const dsFile = dsCandidates.find((p) => fileExists(p) && isFile(p));
  if (!dsFile) {
    const msg = fmt(t.missing_ds_file, { path: join(root, dsName) });
    const p = { ok: false, datasource: dsName, mapper: mapperName, datasourcesRoot: root, error: msg };
    if (jsonOut) process.stdout.write(JSON.stringify(p, null, 2) + "\n"); else console.error(msg);
    return p;
  }

  let params = {};
  try {
    params = await loadJsonParams(jsonParamsOpt);
  } catch (e) {
    const msg = fmt(t.invalid_json, { reason: e.message });
    const p = { ok: false, datasource: dsName, mapper: mapperName, error: msg };
    if (jsonOut) process.stdout.write(JSON.stringify(p, null, 2) + "\n"); else console.error(msg);
    return p;
  }

  let ds;
  try { ds = await assembleDatasource(dsFile, { env }); }
  catch (e) { const p = { ok: false, datasource: dsName, mapper: mapperName, error: `assemble datasource failed: ${e.message}` }; if (jsonOut) process.stdout.write(JSON.stringify(p, null, 2) + "\n"); else console.error(p.error); return p; }

  const queries = ds.queries || ds.mappers || {};
  const available = Object.keys(queries);
  const queryObj = queries[mapperName];
  if (!queryObj) {
    const msg = fmt(t.no_query, { mapper: mapperName, ds: dsName, available: available.join(", ") || "(nessun mapper dichiarato)" });
    const p = { ok: false, datasource: dsName, mapper: mapperName, available_mappers: available, error: msg };
    if (jsonOut) process.stdout.write(JSON.stringify(p, null, 2) + "\n"); else console.error(msg);
    return p;
  }

  let res;
  try {
    const req = {
      path: `cli://${dsName}/${mapperName}`,
      params,
      query: params,
      body: params,
      headers: {},
      aReS: (ds && ds.aReS) ? ds.aReS : (ds ? null : null),
      session: { id: sessionId || `cli-${Date.now()}` },
    };
    res = await queryObj.execute(req);
    if (res && res["€rror"]) throw new Error(res["€rror"] && (typeof res["€rror"] === "object" ? (res["€rror"].message || JSON.stringify(res["€rror"])) : String(res["€rror"])));
  } catch (e) {
    const msg = fmt(t.failed, { mapper: mapperName, ds: dsName, error: e.message });
    const p = { ok: false, datasource: dsName, mapper: mapperName, params, error: msg };
    if (jsonOut) process.stdout.write(JSON.stringify(p, null, 2) + "\n"); else console.error(msg);
    return p;
  }

  const rows = Array.isArray(res) ? res.length : (res && Array.isArray(res.results) ? res.results.length : (res && typeof res.rows === "number" ? res.rows : (res && res.result && Array.isArray(res.result) ? res.result.length : 1)));
  const data = res && Array.isArray(res.results) ? res.results : (Array.isArray(res) ? res : (res && res.result ? res.result : res));
  const p = {
    ok: true,
    datasource: dsName,
    mapper: mapperName,
    env,
    params,
    rows,
    result: data,
  };
  if (jsonOut) process.stdout.write(JSON.stringify(p, null, 2) + "\n");
  else {
    console.log(fmt(t.executed, { mapper: mapperName, ds: dsName, rows }));
    const preview = Array.isArray(data) ? data.slice(0, 50) : data;
    if (Array.isArray(data) && data.length) {
      console.log(JSON.stringify(preview, null, 2));
      if (data.length > 50) console.log(`... (${data.length - 50} more rows omitted)`);
    } else if (data && typeof data === "object") {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(String(data));
    }
  }
  return p;
}

function resolveDatasourcesRootFromOpt(opt) {
  if (opt) return resolve(String(opt));
  if (process.env[DEFAULT_DATASOURCES_ROOT_ENVVAR]) return resolve(process.env[DEFAULT_DATASOURCES_ROOT_ENVVAR]);
  return resolve(process.cwd(), "datasources");
}

export default {
  detectLanguage,
  toSnakeCase,
  formatTimestamp,
  resolveDatasourcesRoot,
  locateDatasourceFile,
  runMakeMapper,
  runMakeMigration,
  runMigrate,
  runProjectInit,
  runDatasourceAdd,
  runDatasourceList,
  runDatasourceRemove,
  runMapperCreate,
  runTest,
  runDocsGenerate,
  runDocsRevise,
  runPromptSave,
  runPromptRun,
  runAIDoctor,
  runMapperExecute,
  DRIVER_PRESETS,
  SUPPORTED_DRIVERS,
};
