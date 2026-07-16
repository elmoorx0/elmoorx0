#!/usr/bin/env node
/**
 * Elmoorx CLI — `elmoorx <command>`
 * ============================================
 *   elmoorx create <name>     scaffold a new project
 *   elmoorx dev               start the dev server
 *   elmoorx build             build for production
 *   elmoorx deploy            deploy to edge (Cloudflare/Vercel/Deno)
 *   elmoorx generate <desc>   AI copilot — generate component
 *   elmoorx doctor            diagnose project health
 *   elmoorx info              show project + environment info
 *   elmoorx analyze           analyze bundle size
 *   elmoorx clean             clean build artifacts
 *   elmoorx upgrade           check for updates
 *   elmoorx --version         print version
 */

import { startDevServer } from "./dev.js";
import { createProject } from "./create.js";
import { buildProject } from "./build.js";
import { generate } from "./generate.js";
import { doctor, info, analyze, clean, checkUpdates, formatDoctorOutput, formatInfoOutput, formatAnalyzeOutput } from "./commands.js";

const [command, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "create": {
      const name = args[0];
      if (!name) {
        console.error("Usage: elmoorx create <project-name>");
        process.exit(1);
      }
      await createProject(name);
      break;
    }
    case "dev": {
      const port = parseInt(args.find((a) => a.startsWith("--port="))?.split("=")[1] || "3000");
      await startDevServer({
        rootDir: process.cwd() + "/src",
        port,
      });
      break;
    }
    case "build": {
      await buildProject(process.cwd());
      break;
    }
    case "generate":
    case "gen": {
      const description = args.join(" ");
      if (!description) {
        console.error("Usage: elmoorx generate \"<description>\"");
        console.error('Example: elmoorx generate "login form"');
        process.exit(1);
      }
      await generate({
        description,
        outDir: process.cwd() + "/src",
        apiKey: process.env.OPENAI_API_KEY,
      });
      break;
    }
    case "deploy": {
      // NOTE: Real deployment requires platform-specific adapters
      // (Cloudflare Workers / Vercel / Deno Deploy). The framework ships
      // those as separate packages; this CLI command is a placeholder
      // that signals "not implemented here" rather than faking success.
      console.error("  ⚠ `elmoorx deploy` is a stub in this CLI.");
      console.error("    To deploy, use the platform-specific adapter:");
      console.error("      • Cloudflare: `npx wrangler deploy`");
      console.error("      • Vercel:     `npx vercel --prod`");
      console.error("      • Deno:       `deno deploy`");
      console.error("    See packages/adapters for the matching build helpers.");
      process.exit(1);
    }
    // eslint-disable-next-line no-fallthrough -- process.exit is `never`, fallthrough is unreachable
    case "doctor": {
      const checks = await doctor(process.cwd());
      console.warn(formatDoctorOutput(checks));
      break;
    }
    case "info": {
      const projectInfo = await info(process.cwd());
      console.warn(formatInfoOutput(projectInfo));
      break;
    }
    case "analyze":
    case "bundle": {
      const analysis = await analyze(process.cwd());
      console.warn(formatAnalyzeOutput(analysis));
      break;
    }
    case "clean": {
      const result = await clean(process.cwd());
      console.warn(`\n  Cleaned:\n`);
      for (const removed of result.removed) {
        console.warn(`  ✓ Removed ${removed}`);
      }
      console.warn(`\n  Freed: ${result.freedBytes} bytes\n`);
      break;
    }
    case "upgrade": {
      const updates = await checkUpdates(process.cwd());
      console.warn("\n  Elmoorx Update Check\n  " + "─".repeat(40) + "\n");
      for (const pkg of updates.packages) {
        const status = pkg.updateAvailable ? `→ ${pkg.latest}` : "(up to date)";
        console.warn(`  ${pkg.name.padEnd(30)} ${pkg.current.padEnd(15)} ${status}`);
      }
      console.warn("");
      break;
    }
    case "--version":
    case "-v":
      console.warn("elmoorx/3.0.0-alpha.2");
      break;
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.warn(`
  Elmoorx Framework v3.0.0-alpha.2 — CLI

  Usage:
    elmoorx create <name>              Scaffold a new project
    elmoorx dev                        Start the dev server (default: port 3000)
    elmoorx build                      Build for production
    elmoorx generate "<description>"   Generate a component (AI Copilot)
    elmoorx doctor                     Health-check the current project
    elmoorx info                       Show project info (deps, sizes, env)
    elmoorx analyze / bundle           Bundle size analysis
    elmoorx clean                      Remove build caches / temp files
    elmoorx upgrade                    Check for framework updates
    elmoorx --version                  Print version
    elmoorx --help                     Show this help

  Examples:
    elmoorx create my-app
    cd my-app
    elmoorx dev

    elmoorx generate "login form"
    elmoorx generate "todo list with filters"
    elmoorx generate "data table with sorting"

  Set OPENAI_API_KEY for AI-powered generation.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
