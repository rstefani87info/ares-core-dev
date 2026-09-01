#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import { createDirectory, setFileContentSync } from "@ares/files";
import {
  detectLanguage,
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
  SUPPORTED_DRIVERS,
} from "./src/cli.js";

function setupCliLogging(argv) {
  const logDir = path.join(process.cwd(), ".ares", "cli-logs");
  createDirectory(logDir, true);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFile = path.join(logDir, `${timestamp}.log`);

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const outputLines = [];

  function captureOutput(type, args) {
    const line = args.map(String).join(" ");
    outputLines.push(`[${type}] ${line}`);
  }

  console.log = (...args) => { captureOutput("LOG", args); originalLog.apply(console, args); };
  console.error = (...args) => { captureOutput("ERR", args); originalError.apply(console, args); };
  console.warn = (...args) => { captureOutput("WRN", args); originalWarn.apply(console, args); };

  return {
    logFile,
    outputLines,
    finish: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      const header = `Command: ${argv.join(" ")}\n\n`;
      const content = header + outputLines.join("\n") + "\n";
      setFileContentSync(logFile, content);
      originalLog(`\n[LOG] Log salvato: ${logFile}`);
    }
  };
}

const DEFAULT_DATASOURCES_ROOT_ENVVAR = "ARES_DATASOURCES_ROOT";

function langStrings(lang) {
  if (lang === "it") {
    return {
      desc: "@ares/core-dev — CLI unificato per tooling e workflow di sviluppo aReS.",
      project_desc: "Operazioni sul progetto aReS.",
      project_init_desc: "Inizializza la struttura standard di un progetto aReS.",
      project_init_projectDir:
        "Directory del progetto (default: directory corrente).",
      project_init_projectName:
        "Nome logico del progetto (default: nome cartella).",
      project_init_force:
        "Sovrascrive file base già esistenti (es. appSetup/index.js).",
      ds_desc: "Operazioni sui datasources del progetto.",
      ds_add_desc:
        "Crea una nuova cartella datasource con driver/preset selezionati.",
      ds_list_desc:
        "Elenca i datasources rilevati sotto la root dei datasources.",
      ds_remove_desc: "Rimuove la cartella di un datasource (operazione distruttiva).",
      ds_add_name: "Nome del datasource (obbligatorio).",
      ds_add_driver:
        `Driver/preset da usare: uno di [${SUPPORTED_DRIVERS.join(", ")}]`,
      ds_add_host: "Host DB (per driver DB-type).",
      ds_add_user: "Utente DB.",
      ds_add_password: "Password DB.",
      ds_add_database: "Nome database (default: uguale al nome datasource).",
      ds_add_port: "Porta DB.",
      ds_add_schema: "Nome schema (default: come nome DB).",
      ds_add_force: "Sovrascrive se la cartella datasource già esiste.",
      ds_dir_opt:
        "Root directory dei datasources (default: $ARES_DATASOURCES_ROOT o ./datasources).",
      mig_desc:
        "Crea o esegue migrazioni per un datasource (ledger ares_db_migrations).",
      mig_make_desc: "Crea una nuova migration manuale per un datasource.",
      mig_make_name: "Nome migration (normalizzato in snake_case).",
      mig_run_desc:
        "Esegue le migrazioni pendenti / rolled_back / failed su un datasource.",
      mig_name_opt:
        "Esegue solo la migration specificata per nome/timestamp.",
      mig_env_opt: "Ambiente runtime: test | production (default: test).",
      mig_force_opt:
        "Forza riesecuzione; salta alcuni controlli di sicurezza.",
      mig_datasource_opt: "Nome datasource (obbligatorio).",
      mapper_desc: "Operazioni sui mapper (query).",
      mapper_create_desc:
        "Crea una nuova coppia di file per un mapper (query + .js).",
      mapper_create_name: "Nome query/mapper.",
      mapper_create_params:
        "Lista parametri in formato name:type:required separati da virgola.",
      mapper_create_type:
        "Tipo query (sql|url|json|xml|xsl).",
      mapper_create_datasource: "Datasource a cui appartiene il mapper.",
      mapper_execute_desc: "Esegue un mapper di un datasource con parametri da file JSON/URL/inline.",
      mapper_execute_datasource: "Nome datasource (obbligatorio, 1° posizionale o --datasource).",
      mapper_execute_mapper: "Nome mapper (query) da eseguire (2° posizionale o --mapper).",
      mapper_execute_json: "Parametri query: path file.json | URL http(s) | JSON inline '{...}'.",
      mapper_execute_env: "Ambiente datasource: test | production (default: test).",
      test_desc: "Lancia gli script di test definiti nel progetto.",
      test_script: "Nome script package.json (default: 'test').",
      test_projectDir: "Directory del progetto (default: cwd).",
      ai_desc: "Integrazione AI (bridge lazy @ares/ai-3rd-party).",
      docs_group_desc: "Genera o revisiona la documentazione del progetto con AI.",
      docs_generate_desc: "Genera documentazione per una cartella/scope progetto.",
      docs_generate_scope: "Directory scope da analizzare (es. ./core, ./modules/x).",
      docs_generate_lang: "Lingua documentazione: it | en (default: it).",
      docs_generate_instructions: "Istruzioni aggiuntive per l'AI (testo libero).",
      docs_revise_desc: "Revisiona e migliora un file di documentazione esistente.",
      docs_revise_file: "Path file .md da revisionare (obbligatorio).",
      prompt_group_desc: "Gestisci prompt: salva in libreria .prompt/ o esegui capability AI.",
      prompt_save_desc: "Salva un prompt in .prompt/<timestamp>-<slug>.md ristrutturato da AI.",
      prompt_save_text: "Testo del prompt (può essere stdin pipe).",
      prompt_save_output_dir: "Cartella di output (default: .prompt/).",
      prompt_save_title_hint: "Suggerimento titolo iniziale (AI può evolverlo).",
      prompt_run_desc: "Esegui un prompt verso una capability AI configurata.",
      prompt_run_text: "Testo del prompt (può essere stdin pipe).",
      prompt_run_capability: "Capability AI: answer_question | prompt_refactor | generate_docs | analyze_code | suggest_migrations | scaffold_code | generate_tests (default: answer_question).",
      prompt_run_force_provider: "Forza un provider specifico (es. openai, anthropic).",
      prompt_run_context_json: "Context aggiuntivo in formato JSON.",
      ai_doctor_desc: "Diagnostica integrazione AI: verifica disponibilità bridge, modalità sample, next steps.",
      common_sample: "Abilita modalità offline/sample stub (non usa provider reali).",
      common_project_id: "Identificatore progetto per sessioni AI (default: nome cartella).",
      common_json: "Output strutturato JSON (default: human friendly).",
      common_session_id: "Identificativo sessione AI (per conversazioni persistenti).",
    };
  }
  return {
    desc: "@ares/core-dev — unified CLI for aReS development tooling & workflows.",
    project_desc: "aReS project operations.",
    project_init_desc: "Initialise the standard aReS project scaffold.",
    project_init_projectDir: "Target directory (default: current directory).",
    project_init_projectName:
      "Logical project name (default: directory name).",
    project_init_force:
      "Overwrite existing base files (e.g. appSetup/index.js).",
    ds_desc: "Datasource operations.",
    ds_add_desc: "Create a new datasource directory using a driver preset.",
    ds_list_desc: "List datasources found under the datasources root.",
    ds_remove_desc:
      "Remove a datasource directory (destructive operation).",
    ds_add_name: "Datasource name (required).",
    ds_add_driver:
      `Driver preset to use: one of [${SUPPORTED_DRIVERS.join(", ")}]`,
    ds_add_host: "DB host (for DB-type drivers).",
    ds_add_user: "DB user.",
    ds_add_password: "DB password.",
    ds_add_database: "DB name (default: same as datasource name).",
    ds_add_port: "DB port.",
    ds_add_schema: "Schema name (default: same as db name).",
    ds_add_force: "Overwrite the datasource directory if it already exists.",
    ds_dir_opt:
      "Datasources root directory (default: $ARES_DATASOURCES_ROOT or ./datasources).",
    mig_desc:
      "Create or run migrations for a datasource (ares_db_migrations ledger).",
    mig_make_desc: "Create a new manual migration for a datasource.",
    mig_make_name: "Migration name (will be normalized to snake_case).",
    mig_run_desc:
      "Run pending / rolled_back / failed migrations on a datasource.",
    mig_name_opt: "Run only the named migration (by name or timestamp prefix).",
    mig_env_opt: "Runtime environment: test | production (default: test).",
    mig_force_opt: "Force re-run; bypass some safety checks.",
    mig_datasource_opt: "Target datasource (required).",
    mapper_desc: "Mapper (query) operations.",
    mapper_create_desc:
      "Create a new mapper pair (query file + .js declaration).",
    mapper_create_name: "Query/mapper name.",
    mapper_create_params:
      "Parameter list as name:type:required separated by commas.",
    mapper_create_type: "Query type (sql|url|json|xml|xsl).",
    mapper_create_datasource: "Datasource owning the mapper.",
    mapper_execute_desc: "Execute a mapper (query) on a datasource with params from JSON file/URL/inline.",
    mapper_execute_datasource: "Datasource name (1st positional or --datasource).",
    mapper_execute_mapper: "Mapper (query) name to execute (2nd positional or --mapper).",
    mapper_execute_json: "Query params: file.json path | http(s) URL | inline JSON '{...}'.",
    mapper_execute_env: "Datasource environment: test | production (default: test).",
    test_desc: "Run project test scripts defined in package.json.",
    test_script: "package.json script name (default: 'test').",
    test_projectDir: "Project directory (default: cwd).",
    ai_desc: "AI integration (lazy bridge @ares/ai-3rd-party).",
    docs_group_desc: "Generate or revise project documentation with AI assistance.",
    docs_generate_desc: "Generate documentation for a project scope/folder.",
    docs_generate_scope: "Scope directory to analyse (e.g. ./core, ./modules/x).",
    docs_generate_lang: "Documentation language: it | en (default: it).",
    docs_generate_instructions: "Additional free-text instructions for AI.",
    docs_revise_desc: "Revise and improve an existing documentation file.",
    docs_revise_file: "Path to .md file to revise (required).",
    prompt_group_desc: "Manage prompts: save to .prompt/ library or run AI capability.",
    prompt_save_desc: "Save a prompt restructured by AI to .prompt/<timestamp>-<slug>.md.",
    prompt_save_text: "Prompt text (can also be piped from stdin).",
    prompt_save_output_dir: "Output folder (default: .prompt/).",
    prompt_save_title_hint: "Initial title hint (AI may evolve it).",
    prompt_run_desc: "Run a prompt against a configured AI capability.",
    prompt_run_text: "Prompt text (can also be piped from stdin).",
    prompt_run_capability: "AI capability: answer_question | prompt_refactor | generate_docs | analyze_code | suggest_migrations | scaffold_code | generate_tests (default: answer_question).",
    prompt_run_force_provider: "Force a specific provider (e.g. openai, anthropic).",
    prompt_run_context_json: "Additional context in JSON format.",
    ai_doctor_desc: "AI integration diagnostics: check bridge availability, sample mode, next steps.",
    common_sample: "Enable offline/sample stub mode (no real providers used).",
    common_project_id: "Project id for AI sessions (default: folder name).",
    common_json: "Structured JSON output (default: human friendly).",
    common_session_id: "AI session id (for persistent conversations).",
  };
}

async function main() {
  const logging = setupCliLogging(process.argv.slice(1));
  const lang = detectLanguage();
  const t = langStrings(lang);
  const defaultDsRoot =
    process.env[DEFAULT_DATASOURCES_ROOT_ENVVAR] || "./datasources";

  const cli = yargs(hideBin(process.argv))
    .scriptName("ares-core-dev")
    .usage(`$0 <command>\n\n${t.desc}`)
    .strictCommands()
    .completion()
    .exitProcess(false);

  cli.command(
    "project <command>",
    t.project_desc,
    (y) =>
      y
        .command(
          "init",
          t.project_init_desc,
          (yy) =>
            yy
              .option("project-dir", {
                type: "string",
                description: t.project_init_projectDir,
                default: process.cwd(),
              })
              .option("project-name", {
                type: "string",
                description: t.project_init_projectName,
                default: null,
              })
              .option("force", {
                alias: "f",
                type: "boolean",
                description: t.project_init_force,
                default: false,
              }),
          async (argv) => {
            const result = await runProjectInit({
              projectDir: argv["project-dir"],
              projectName: argv["project-name"],
              force: Boolean(argv.force),
            });
            process.exitCode = 0;
          },
        )
        .demandCommand(1, "Subcommand required: [init]"),
  );

  cli.command(
    "datasource <command>",
    t.ds_desc,
    (y) =>
      y
        .option("datasource-dir", {
          alias: ["D", "root"],
          type: "string",
          description: t.ds_dir_opt,
          default: defaultDsRoot,
        })
        .command(
          "add",
          t.ds_add_desc,
          (yy) =>
            yy
              .option("name", {
                alias: "n",
                type: "string",
                demandOption: true,
                description: t.ds_add_name,
              })
              .option("driver", {
                alias: ["d", "drv"],
                type: "string",
                choices: SUPPORTED_DRIVERS,
                default: "mysql",
                description: t.ds_add_driver,
              })
              .option("host", { type: "string", description: t.ds_add_host })
              .option("user", { type: "string", description: t.ds_add_user })
              .option("password", {
                type: "string",
                description: t.ds_add_password,
              })
              .option("database", {
                alias: "db",
                type: "string",
                description: t.ds_add_database,
              })
              .option("port", { type: "number", description: t.ds_add_port })
              .option("schema", { type: "string", description: t.ds_add_schema })
              .option("force", {
                alias: "f",
                type: "boolean",
                default: false,
                description: t.ds_add_force,
              }),
          async (argv) => {
            await runDatasourceAdd({
              name: argv.name,
              driver: argv.driver,
              datasourceDir: argv["datasource-dir"],
              host: argv.host,
              user: argv.user,
              password: argv.password,
              database: argv.database,
              port: argv.port,
              schemaName: argv.schema,
              force: Boolean(argv.force),
            });
            process.exitCode = 0;
          },
        )
        .command("list", t.ds_list_desc, {}, async (argv) => {
          await runDatasourceList({ datasourceDir: argv["datasource-dir"] });
          process.exitCode = 0;
        })
        .command(
          "remove",
          t.ds_remove_desc,
          (yy) =>
            yy
              .option("name", {
                alias: "n",
                type: "string",
                demandOption: true,
                description: t.ds_add_name,
              })
              .option("force", {
                alias: "f",
                type: "boolean",
                default: true,
              }),
          async (argv) => {
            await runDatasourceRemove({
              name: argv.name,
              datasourceDir: argv["datasource-dir"],
              force: Boolean(argv.force),
            });
            process.exitCode = 0;
          },
        )
        .demandCommand(1, "Subcommand required: [add|list|remove]"),
  );

  cli.command(
    "migration <command>",
    t.mig_desc,
    (y) =>
      y
        .option("datasource", {
          alias: ["d", "ds"],
          type: "string",
          description: t.mig_datasource_opt,
        })
        .option("datasource-dir", {
          alias: ["D", "root"],
          type: "string",
          description: t.ds_dir_opt,
          default: defaultDsRoot,
        })
        .command(
          "make",
          t.mig_make_desc,
          (yy) =>
            yy
              .option("name", {
                alias: "n",
                type: "string",
                demandOption: true,
                description: t.mig_make_name,
              })
              .option("datasource", {
                alias: ["d", "ds"],
                type: "string",
                demandOption: true,
                description: t.mig_datasource_opt,
              }),
          async (argv) => {
            await runMakeMigration({
              name: argv.name,
              datasource: argv.datasource,
              datasourceDir: argv["datasource-dir"],
            });
            process.exitCode = 0;
          },
        )
        .command(
          "run",
          t.mig_run_desc,
          (yy) =>
            yy
              .option("datasource", {
                alias: ["d", "ds"],
                type: "string",
                demandOption: true,
                description: t.mig_datasource_opt,
              })
              .option("name", {
                alias: "n",
                type: "string",
                description: t.mig_name_opt,
                default: null,
              })
              .option("force", {
                alias: "f",
                type: "boolean",
                default: false,
                description: t.mig_force_opt,
              })
              .option("env", {
                alias: ["e", "environment"],
                type: "string",
                choices: ["test", "production", "prod"],
                description: t.mig_env_opt,
                default: "test",
              }),
          async (argv) => {
            const result = await runMigrate({
              datasource: argv.datasource,
              name: argv.name,
              force: Boolean(argv.force),
              datasourceDir: argv["datasource-dir"],
              env: argv.env,
            });
            process.exitCode = typeof result?.exitCode === "number" ? result.exitCode : 0;
          },
        )
        .demandCommand(1, "Subcommand required: [make|run]"),
  );

  cli.command(
    "mapper <command>",
    t.mapper_desc,
    (y) =>
      y
        .option("datasource-dir", {
          alias: ["D", "root"],
          type: "string",
          description: t.ds_dir_opt,
          default: defaultDsRoot,
        })
        .command(
          "create",
          t.mapper_create_desc,
          (yy) =>
            yy
              .option("name", {
                alias: "n",
                type: "string",
                demandOption: true,
                description: t.mapper_create_name,
              })
              .option("datasource", {
                alias: ["d", "ds"],
                type: "string",
                demandOption: true,
                description: t.mapper_create_datasource,
              })
              .option("params", {
                alias: "p",
                type: "string",
                demandOption: true,
                description: t.mapper_create_params,
              })
              .option("type", {
                alias: ["q", "query-type"],
                type: "string",
                choices: ["sql", "url", "json", "xml", "xsl"],
                demandOption: true,
                description: t.mapper_create_type,
              }),
          async (argv) => {
            await runMapperCreate({
              name: argv.name,
              datasource: argv.datasource,
              params: argv.params,
              type: argv.type,
              datasourceDir: argv["datasource-dir"],
            });
            process.exitCode = 0;
          },
        )
        .command(
          "execute <datasource> <mapper>",
          t.mapper_execute_desc,
          (yy) =>
            yy
              .option("json", {
                alias: ["j", "p", "params"],
                type: "string",
                default: "",
                description: t.mapper_execute_json,
              })
              .option("env", {
                alias: ["e", "environment"],
                type: "string",
                choices: ["test", "production"],
                default: "test",
                description: t.mapper_execute_env,
              })
              .option("session-id", {
                alias: "sid",
                type: "string",
                default: null,
                description: "ID sessione datasource opzionale.",
              }),
          async (argv) => {
            const result = await runMapperExecute({
              datasource: argv.datasource,
              mapper: argv.mapper,
              datasourcesRoot: argv["datasource-dir"],
              json: argv.json,
              env: argv.env,
              sessionId: argv["session-id"],
              jsonOut: Boolean(argv.j),
              sample: Boolean(argv.sample),
            });
            process.exitCode = result?.ok === false ? 1 : 0;
          },
        )
        .demandCommand(1, "Subcommand required: [create|execute]"),
  );

  cli.command(
    "test [scriptName]",
    t.test_desc,
    (y) =>
      y
        .option("project-dir", {
          type: "string",
          description: t.test_projectDir,
          default: process.cwd(),
        })
        .positional("scriptName", {
          describe: t.test_script,
          type: "string",
          default: "test",
        }),
    async (argv) => {
      const rest = argv._?.slice?.(2) ?? [];
      const result = await runTest({
        scriptName: argv.scriptName,
        projectDir: argv["project-dir"],
        args: rest,
      });
      process.exitCode = typeof result?.code === "number" ? result.code : 0;
    },
  );

  cli.command(
    "docs <command>",
    t.docs_group_desc,
    (y) =>
      y
        .option("sample", { alias: "s", type: "boolean", default: false, description: t.common_sample })
        .option("project-id", { type: "string", default: null, description: t.common_project_id })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json })
        .command(
          "generate",
          t.docs_generate_desc,
          (yy) =>
            yy
              .option("scope", {
                alias: ["S", "dir"],
                type: "string",
                demandOption: true,
                description: t.docs_generate_scope,
              })
              .option("lang", {
                alias: "l",
                type: "string",
                choices: ["it", "en"],
                default: "it",
                description: t.docs_generate_lang,
              })
              .option("instructions", {
                alias: ["i", "instr"],
                type: "string",
                default: "",
                description: t.docs_generate_instructions,
              }),
          async (argv) => {
            const result = await runDocsGenerate({
              scope: argv.scope,
              lang: argv.lang,
              instructions: argv.instructions,
              projectId: argv["project-id"],
              sample: Boolean(argv.sample),
              json: Boolean(argv.json),
            });
            process.exitCode = result?.ok === false ? 1 : 0;
          },
        )
        .command(
          "revise",
          t.docs_revise_desc,
          (yy) =>
            yy
              .option("file", {
                alias: ["f", "F"],
                type: "string",
                demandOption: true,
                description: t.docs_revise_file,
              })
              .option("lang", {
                alias: "l",
                type: "string",
                choices: ["it", "en"],
                default: "it",
                description: t.docs_generate_lang,
              })
              .option("instructions", {
                alias: ["i", "instr"],
                type: "string",
                default: "",
                description: t.docs_generate_instructions,
              }),
          async (argv) => {
            const result = await runDocsRevise({
              file: argv.file,
              lang: argv.lang,
              instructions: argv.instructions,
              projectId: argv["project-id"],
              sample: Boolean(argv.sample),
              json: Boolean(argv.json),
            });
            process.exitCode = result?.ok === false ? 1 : 0;
          },
        )
        .demandCommand(1, "Subcommand required: [generate|revise]"),
  );

  cli.command(
    "prompt <command>",
    t.prompt_group_desc,
    (y) =>
      y
        .option("sample", { alias: "s", type: "boolean", default: false, description: t.common_sample })
        .option("project-id", { type: "string", default: null, description: t.common_project_id })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json })
        .command(
          "save",
          t.prompt_save_desc,
          (yy) =>
            yy
              .option("text", {
                alias: "t",
                type: "string",
                default: "",
                description: t.prompt_save_text,
              })
              .option("output-dir", {
                alias: ["o", "dir"],
                type: "string",
                default: ".ares/prompt",
                description: t.prompt_save_output_dir,
              })
              .option("title-hint", {
                alias: "title",
                type: "string",
                default: "",
                description: t.prompt_save_title_hint,
              }),
          async (argv) => {
            const result = await runPromptSave({
              text: argv.text,
              outputDir: argv["output-dir"],
              titleHint: argv["title-hint"],
              projectId: argv["project-id"],
              sample: Boolean(argv.sample),
              json: Boolean(argv.json),
            });
            process.exitCode = result?.ok === false ? 1 : 0;
          },
        )
        .command(
          "run",
          t.prompt_run_desc,
          (yy) =>
            yy
              .option("text", {
                alias: "t",
                type: "string",
                default: "",
                description: t.prompt_run_text,
              })
              .option("capability", {
                alias: ["c", "cap"],
                type: "string",
                choices: [
                  "answer_question",
                  "prompt_refactor",
                  "generate_docs",
                  "analyze_code",
                  "suggest_migrations",
                  "scaffold_code",
                  "generate_tests",
                  "code_refactor",
                ],
                default: "answer_question",
                description: t.prompt_run_capability,
              })
              .option("force-provider", {
                alias: ["p", "provider"],
                type: "string",
                default: null,
                description: t.prompt_run_force_provider,
              })
              .option("context-json", {
                alias: "ctx",
                type: "string",
                default: null,
                description: t.prompt_run_context_json,
              })
              .option("session-id", {
                alias: "sid",
                type: "string",
                default: null,
                description: t.common_session_id,
              }),
          async (argv) => {
            const result = await runPromptRun({
              text: argv.text,
              capability: argv.capability,
              forceProvider: argv["force-provider"],
              contextJson: argv["context-json"],
              sessionId: argv["session-id"],
              projectId: argv["project-id"],
              sample: Boolean(argv.sample),
              json: Boolean(argv.json),
            });
            process.exitCode = result?.ok === false ? 1 : 0;
          },
        )
        .demandCommand(1, "Subcommand required: [save|run]"),
  );

  cli.command(
    "ai-doctor",
    t.ai_doctor_desc,
    (y) =>
      y
        .option("sample", { alias: "s", type: "boolean", default: false, description: t.common_sample })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json }),
    async (argv) => {
      const result = await runAIDoctor({
        sample: Boolean(argv.sample),
        json: Boolean(argv.json),
      });
      process.exitCode = result?.ok === false ? 1 : 0;
    },
  );

  // ============= Comandi ereditati da @ares/scd (bridge lazy dynamic import) =============
  // Design: core-dev NON dichiara @ares/scd dipendenza package.json.
  // Se SCD è disponibile nel workspace (symlink Yarn) → dynamic import diretto e chiamata funzioni.
  // Se SCD non disponibile → spawn di `ares-scd` via PATH (o `node ../scd/cli.js` fallback).
  // Fallback finale: messaggio istruzioni.

  async function runScdBridged({ commandName, positional = [], options = {}, json = false }) {
    let mod = null;
    const searchPaths = [
      () => import("@ares/scd/cli.js"),
      () => import("../../scd/cli.js"),
      () => import("../scd/cli.js"),
    ];
    for (const loader of searchPaths) { try { mod = await loader(); if (mod) break; } catch {} }
    if (mod) {
      const { JobOutput } = await (async () => {
        let jom = null;
        try { jom = await import("@ares/scd/src/job-output.js"); } catch {
          try { jom = await import("../../scd/src/job-output.js"); } catch {
            try { jom = await import("../scd/src/job-output.js"); } catch {}
          }
        }
        if (!jom || !jom.JobOutput) {
          return { JobOutput: class { constructor(o={}){ this.name=o.name||"scd-bridge"; this.triggerBy=o.triggerBy||"core_dev"; this.logInfo=()=>{}; this.logWarn=()=>{}; this.logDebug=()=>{}; this.addArtifact=()=>{}; this.status="DONE"; this.result=null; this.toJSON=()=>({name:this.name,status:this.status,result:this.result}); } } };
        }
        return jom;
      })();
      const fnKey = commandName.split("-").map((s,i) => i===0 ? s : (s[0].toUpperCase()+s.slice(1))).join("") + "Command";
      const fn = mod[fnKey];
      if (typeof fn === "function") {
        const job = new JobOutput({ name: `ares-core-dev ${commandName}`, triggerBy: "core_dev_yargs" });
        try {
          const result = await fn(positional, options, job);
          job.status = "DONE";
          job.result = result || job.result || null;
          if (json) process.stdout.write(JSON.stringify(job.toJSON(), null, 2) + "\n");
          else if (result && typeof result === "object") {
            if (result.outputFile) console.log(`Creato: ${result.outputFile}`);
            else if (result.ticketsGenerated) console.log(`Analisi completata: ${result.ticketsGenerated} ticket suggeriti in ${result.suggestedDir || ".ares/tasks/suggested"}`);
            else console.log(`Completato: ${commandName}`);
          }
          return { ok: true, bridged: "scd_dynamic_import", job: job.toJSON() };
        } catch (e) {
          job.status = "FAILED";
          if (json) process.stderr.write(JSON.stringify({ ok: false, error: e.message, stderr: e.stderr || "", stdout: e.stdout || "", job: job.toJSON() }, null, 2) + "\n");
          else console.error(`[ares-core-dev scd bridge] ${commandName} fallito: ${e.message}${e.stderr ? "\n" + e.stderr.trim() : ""}`);
          return { ok: false, error: e.message };
        }
      }
    }
    // Fallback: spawn CLI ares-scd via subprocess
    const { spawn } = await import("node:child_process");
    let path0 = "scd/cli.js";
    try {
      if (typeof import.meta.resolve === "function") {
        const r = import.meta.resolve("@ares/scd/cli.js");
        if (r && r.startsWith("file://")) path0 = r.replace(/^file:\/\/\//, "").replace(/^\/([A-Za-z]:)/, "$1");
      }
    } catch {}
    if (!path0 || !path0.includes("scd")) {
      const r1 = new URL("../../scd/cli.js", import.meta.url).pathname;
      path0 = r1.replace(/^\/([A-Za-z]:)/, "$1");
    }
    const subArgs = [path0, ...commandName.split("-"), ...positional];
    for (const k of Object.keys(options || {})) {
      if (options[k] === undefined || options[k] === null || options[k] === false) continue;
      subArgs.push(`--${k}`);
      if (options[k] !== true) subArgs.push(String(options[k]));
    }
    return await new Promise((resolve) => {
      try {
        const cp = spawn(process.execPath, subArgs, {
          stdio: "inherit", shell: false, windowsHide: true, cwd: process.cwd(),
        });
        cp.on("error", (e) => {
          console.error("[ares-core-dev] @ares/scd non disponibile nel workspace. Installalo via `yarn add @ares/scd` o usa `ares-scd make prompt` direttamente. Dettaglio: " + e.message);
          resolve({ ok: false, error: `scd_not_available: ${e.message}` });
        });
        cp.on("exit", (code) => {
          process.exitCode = code || 0;
          resolve({ ok: code === 0, bridged: "scd_subprocess", exitCode: code });
        });
      } catch (e) {
        console.error("[ares-core-dev] bridge ares-scd fallito: " + e.message);
        resolve({ ok: false, error: e.message });
      }
    });
  }

  cli.command(
    "make <command>",
    "Crea prompt, documentazione o ticket con AI (ereditato da ares-scd).",
    (y) =>
      y
        .option("sample", { alias: "s", type: "boolean", default: false, description: t.common_sample })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json })
        .command(
          "prompt",
          "Crea un prompt in .prompt/ da --path file/URL o --text/stdin ristrutturato da AI. Con --title auto-analizza la codebase per estrarre contesto.",
          (yy) =>
            yy
              .option("path", { alias: "p", type: "string", default: "", description: "Path file (qualsiasi .md/.txt/.js/.ts) o URL http(s) contenente il prompt grezzo." })
              .option("text", { alias: "t", type: "string", default: "", description: "Testo diretto prompt." })
              .option("output-dir", { alias: ["o", "dir"], type: "string", default: ".ares/prompt", description: "Cartella output (default .ares/prompt/)." })
              .option("title-hint", { alias: "th", type: "string", default: "", description: "Suggerimento titolo iniziale." })
              .option("title", { alias: "T", type: "string", default: "", description: "Titolo ESPLICITO: auto-analizza codebase per keyword e genera contesto. Può essere usato SENZA --path/--text/stdin." })
              .option("scope", { alias: "S", type: "string", default: process.cwd(), description: "Scope directory per l'analisi codebase automatica (default CWD)." }),
          async (argv) => {
            const options = {
              path: argv.path,
              text: argv.text,
              "output-dir": argv["output-dir"],
              "title-hint": argv["title-hint"],
              title: argv.title,
              scope: argv.scope,
              sample: Boolean(argv.sample),
            };
            const r = await runScdBridged({ commandName: "make-prompt", positional: [], options, json: Boolean(argv.json) });
            process.exitCode = r.ok ? 0 : 1;
          },
        )
        .command(
          "docs",
          "Genera documentazione standard aReS .ares/docs/it e .ares/docs/en via AI per una cartella progetto.",
          (yy) =>
            yy
              .option("scope", { alias: "S", type: "string", default: process.cwd(), description: "Scope directory da documentare (default CWD)." })
              .option("lang", { alias: "l", type: "string", choices: ["it", "en"], default: "it", description: "Lingua principale." })
              .option("instructions", { alias: ["i", "instr"], type: "string", default: "", description: "Istruzioni aggiuntive per l'AI." }),
          async (argv) => {
            const options = { scope: argv.scope, lang: argv.lang, instructions: argv.instructions, sample: Boolean(argv.sample) };
            const r = await runScdBridged({ commandName: "make-docs", positional: [], options, json: Boolean(argv.json) });
            process.exitCode = r.ok ? 0 : 1;
          },
        )
        .command(
          "ticket",
          "Crea un ticket checklist in .ares/tasks/ da --path file/URL o --text/stdin via AI.",
          (yy) =>
            yy
              .option("path", { alias: "p", type: "string", default: "", description: "Path file o URL http(s) con nota grezza." })
              .option("text", { alias: "t", type: "string", default: "", description: "Testo diretto nota/richiesta." })
              .option("output-dir", { alias: ["o", "dir"], type: "string", default: ".ares/tasks", description: "Cartella output (default .ares/tasks/)." }),
          async (argv) => {
            const options = { path: argv.path, text: argv.text, "output-dir": argv["output-dir"], sample: Boolean(argv.sample) };
            const r = await runScdBridged({ commandName: "make-ticket", positional: [], options, json: Boolean(argv.json) });
            process.exitCode = r.ok ? 0 : 1;
          },
        )
        .demandCommand(1, "Subcommand richiesto: [prompt|docs|ticket]"),
  );

  cli.command(
    "work ticket <filename>",
    "Analizza e lavora un ticket checklist esistente (prefisso timestamp o slug sufficiente; bridge ares-scd).",
    (y) =>
      y
        .option("output", { alias: "o", type: "string", default: "", description: "File report output opzionale." })
        .option("sample", { alias: "s", type: "boolean", default: false, description: t.common_sample })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json }),
    async (argv) => {
      const options = { output: argv.output, sample: Boolean(argv.sample) };
      const r = await runScdBridged({ commandName: "work-ticket", positional: [argv.filename], options, json: Boolean(argv.json) });
      process.exitCode = r.ok ? 0 : 1;
    },
  );

  cli.command(
    "analyze code",
    "Analizza codice in un progetto e genera ticket di miglioramento in .ares/tasks/suggested/ (bridge ares-scd).",
    (y) =>
      y
        .option("scope", { alias: ["S", "dir"], type: "string", default: process.cwd(), description: "Scope directory da analizzare (default CWD)." })
        .option("max-depth", { alias: ["d", "depth"], type: "number", default: 3, description: "Profondità massima ricorsione (default 3)." })
        .option("output", { alias: "o", type: "string", default: "", description: "File report JSON opzionale." })
        .option("sample", { alias: "s", type: "boolean", default: false, description: t.common_sample })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json }),
    async (argv) => {
      const options = { scope: argv.scope, "max-depth": argv["max-depth"], output: argv.output, sample: Boolean(argv.sample) };
      const r = await runScdBridged({ commandName: "analyze-code", positional: [], options, json: Boolean(argv.json) });
      process.exitCode = r.ok ? 0 : 1;
    },
  );

  // ============= Comandi aReS create/install-local/create-remote (proxy scd con prefisso ares-) =============

  function aresLangStrings(lang) {
    if (lang === "it") {
      return {
install_local_desc: "Create and configure a new module locally (proxy install-local).",
      install_local_name: "Module name.",
      install_local_path: "Parent directory where the project folder will be created.",
      install_local_local_name: "Local directory name different from the repo name.",
      install_local_description: "Project description (written in package.json).",
      install_local_yes: "Skip interactive prompts (use defaults).",
      create_remote_desc: "Create a GitHub repository for a module (proxy create-remote).",
      create_remote_name: "Module name.",
      create_remote_token: "GitHub personal access token.",
      create_remote_private: "Create the repository as private.",
      create_desc: "Create GitHub repository AND configure module locally (proxy create).",
      create_name: "Module name.",
      create_token: "GitHub personal access token.",
      create_path: "Parent directory where the project folder will be created.",
      create_local_name: "Local directory name different from the repo name.",
      create_description: "Project description (written in package.json).",
      create_yes: "Skip interactive prompts (use defaults).",
      create_remote_only: "Only create the GitHub repository.",
      create_local_only: "Only configure the local project (skip remote creation).",
      };
    }
    return {
      install_local_desc: "Create and configure a new module locally (proxy install-local).",
      install_local_name: "Module name.",
      install_local_path: "Parent directory where the project folder will be created.",
      install_local_local_name: "Local directory name different from the repo name.",
      install_local_description: "Project description (written in package.json).",
      install_local_yes: "Skip interactive prompts (use defaults).",
      create_remote_desc: "Create a GitHub repository for a module (proxy create-remote).",
      create_remote_name: "Module name.",
      create_remote_token: "GitHub personal access token.",
      create_remote_private: "Create the repository as private.",
      create_desc: "Create GitHub repository AND configure module locally (proxy create).",
      create_name: "Module name.",
      create_token: "GitHub personal access token.",
      create_path: "Parent directory where the project folder will be created.",
      create_local_name: "Local directory name different from the repo name.",
      create_description: "Project description (written in package.json).",
      create_yes: "Skip interactive prompts (use defaults).",
      create_remote_only: "Only create the GitHub repository.",
      create_local_only: "Only configure the local project (skip remote creation).",
    };
  }

  const at = aresLangStrings(lang);

  function buildAresOptions(argv, extra = {}) {
    const name = argv.name;
    const opts = {
      "github-user": "rstefani87info",
      module: name,
      description: argv.description,
      yes: Boolean(argv.yes),
      ...extra,
    };
    if (argv.path) opts.path = argv.path;
    if (argv["local-name"]) opts["local-name"] = argv["local-name"];
    return { name, opts };
  }

  cli.command(
    "install-local <name>",
    at.install_local_desc,
    (y) =>
      y
        .option("path", { alias: "p", type: "string", default: null, description: at.install_local_path })
        .option("local-name", { alias: "l", type: "string", default: null, description: at.install_local_local_name })
        .option("description", { alias: "d", type: "string", default: "", description: at.install_local_description })
        .option("yes", { alias: "y", type: "boolean", default: false, description: at.install_local_yes })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json }),
    async (argv) => {
      const { name, opts } = buildAresOptions(argv);
      const r = await runScdBridged({ commandName: "install-local", positional: [name], options: opts, json: Boolean(argv.json) });

      if (r.ok) {
        const localDir = r.job?.result?.localDir;
        if (localDir) {
          const { exec } = await import("node:child_process");
          await new Promise((resolve) => {
            exec("yarn add -D @ares/core-dev@workspace:*", { cwd: localDir, shell: true }, (err) => {
              if (err) console.error(`[ares-core-dev] Failed to install @ares/core-dev: ${err.message}`);
              resolve();
            });
          });
        }
      }

      process.exitCode = r.ok ? 0 : 1;
    },
  );

  cli.command(
    "create-remote <name>",
    at.create_remote_desc,
    (y) =>
      y
        .option("github-token", { type: "string", demandOption: true, description: at.create_remote_token })
        .option("private", { alias: "p", type: "boolean", default: false, description: at.create_remote_private })
        .option("description", { alias: "d", type: "string", default: "", description: at.create_description })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json }),
    async (argv) => {
      const name = argv.name;
      const options = {
        "github-token": argv["github-token"],
        private: Boolean(argv.private),
        description: argv.description,
      };
      const r = await runScdBridged({ commandName: "create-remote", positional: [name], options, json: Boolean(argv.json) });
      process.exitCode = r.ok ? 0 : 1;
    },
  );

  cli.command(
    "create <name>",
    at.create_desc,
    (y) =>
      y
        .option("github-token", { type: "string", demandOption: true, description: at.create_token })
        .option("path", { alias: "p", type: "string", default: null, description: at.create_path })
        .option("local-name", { alias: "l", type: "string", default: null, description: at.create_local_name })
        .option("description", { alias: "d", type: "string", default: "", description: at.create_description })
        .option("yes", { alias: "y", type: "boolean", default: false, description: at.create_yes })
        .option("private", { type: "boolean", default: false, description: at.create_remote_private })
        .option("remote-only", { type: "boolean", default: false, description: at.create_remote_only })
        .option("local-only", { type: "boolean", default: false, description: at.create_local_only })
        .option("json", { alias: "j", type: "boolean", default: false, description: t.common_json }),
    async (argv) => {
      const { name, opts } = buildAresOptions(argv, {
        "github-token": argv["github-token"],
        private: Boolean(argv.private),
        "remote-only": Boolean(argv["remote-only"]),
        "local-only": Boolean(argv["local-only"]),
      });
      const r = await runScdBridged({ commandName: "create", positional: [name], options: opts, json: Boolean(argv.json) });
      process.exitCode = r.ok ? 0 : 1;
    },
  );

  await cli.help().demandCommand(1, "Missing command. Use --help.").parseAsync();
  logging.finish();
}

main().catch((err) => {
  console.error("[ares-core-dev] Fatal error\n", err);
  process.exit(1);
});
