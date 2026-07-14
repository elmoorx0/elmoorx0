/**
 * @elmoorx/cli-pro — Advanced CLI commands: scaffolding, deployment, codegen
 * ============================================
 * Companion to `@elmoorx/cli`. Import and register these commands to
 * extend the base `elmoorx` CLI.
 *
 *   import { registerProCommands, commands } from "@elmoorx/cli-pro";
 *   registerProCommands(); // returns { run(argv) => Promise<void> }
 *
 * CAVEAT (alpha): All 4 commands (scaffold:crud, deploy:preview,
 * codegen:types, migrate:create) are STUBS. They throw a clear error
 * directing callers to alternatives, instead of silently logging
 * "not yet implemented" and exiting 0 (the previous behavior misled
 * users into thinking the command succeeded).
 */

export interface ProCommand {
  name: string;
  description: string;
  args?: Array<{ name: string; required?: boolean; description?: string }>;
  run(args: string[]): Promise<void>;
}

export const commands: ProCommand[] = [
  {
    name: "scaffold:crud",
    description: "Scaffold a complete CRUD resource (model, API, UI)",
    args: [
      { name: "name", required: true, description: "Resource name (e.g. Post)" },
    ],
    async run(args) {
      const [name] = args;
      if (!name) {
        console.error("Usage: elmoorx scaffold:crud <Name>");
        process.exit(1);
      }
      throw new Error(
        `[cli-pro] scaffold:crud is not yet implemented. ` +
        `The alpha release does not include the CRUD scaffolder. ` +
        `Track progress at https://github.com/elmoorx0/elmoorx0/issues.`
      );
    },
  },
  {
    name: "deploy:preview",
    description: "Deploy a preview build to a temporary edge URL",
    async run() {
      throw new Error(
        `[cli-pro] deploy:preview is not yet implemented. ` +
        `Use \`elmoorx deploy --target=vercel\` for production deployments.`
      );
    },
  },
  {
    name: "codegen:types",
    description: "Generate TypeScript types from the database schema",
    args: [
      { name: "schema", description: "Path to schema.sql (default: db/schema.sql)" },
    ],
    async run(args) {
      const [schemaPath = "db/schema.sql"] = args;
      throw new Error(
        `[cli-pro] codegen:types from ${schemaPath} is not yet implemented. ` +
        `Use 'kysely-codegen' or 'prisma generate' for SQL-to-TS type generation.`
      );
    },
  },
  {
    name: "migrate:create",
    description: "Create a new migration file with timestamp",
    args: [{ name: "name", required: true }],
    async run(args) {
      const [name] = args;
      if (!name) {
        console.error("Usage: elmoorx migrate:create <name>");
        process.exit(1);
      }
      throw new Error(
        `[cli-pro] migrate:create is not yet implemented. ` +
        `Use @elmoorx/postgres's migrate() API or 'drizzle-kit generate' for migrations.`
      );
    },
  },
];

export function registerProCommands(): {
  run: (argv: string[]) => Promise<void>;
} {
  return {
    async run(argv: string[]) {
      const [cmd, ...rest] = argv;
      const command = commands.find((c) => c.name === cmd);
      if (!command) {
        console.error(`Unknown pro command: ${cmd}`);
        console.error("Available commands:");
        for (const c of commands) {
          console.error(`  ${c.name.padEnd(24)} ${c.description}`);
        }
        process.exit(1);
      }
      await command.run(rest);
    },
  };
}

export const VERSION = "3.0.0-alpha.2";
