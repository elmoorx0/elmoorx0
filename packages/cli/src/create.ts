/**
 * elmoorx create <name>
 * Scaffolds a new project with sensible defaults:
 *   - TypeScript
 *   - src/index.elmoorx.tsx  (Counter example)
 *   - package.json
 *   - tsconfig.json
 *   - .gitignore
 *   - README.md
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function createProject(name: string): Promise<void> {
  const root = join(process.cwd(), name);
  console.warn(`\n  Creating Elmoorx project: ${name}\n`);

  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "public"), { recursive: true });

  await writeFile(
    join(root, "package.json"),
    JSON.stringify(
      {
        name,
        version: "0.1.0",
        type: "module",
        scripts: {
          dev: "elmoorx dev",
          build: "elmoorx build",
          deploy: "elmoorx deploy",
        },
        dependencies: {
          "@elmoorx/runtime": "^1.0.0",
        },
        devDependencies: {
          "@elmoorx/cli": "^1.0.0",
          typescript: "^5.4.0",
        },
      },
      null,
      2
    )
  );

  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          strict: true,
          jsx: "react-jsx",
          jsxImportSource: "@elmoorx/runtime",
          outDir: "dist",
        },
        include: ["src/**/*"],
      },
      null,
      2
    )
  );

  await writeFile(
    join(root, "src", "index.elmoorx.tsx"),
    `import { $state, island, h } from "@elmoorx/runtime";

const Counter = island(() => {
  const count = $state(0);
  return h(
    "button",
    { onClick: () => count.set((c) => c + 1), class: "counter" },
    "Count: ",
    () => count()
  );
});

export default function Page() {
  return h(
    "main",
    { class: "page" },
    h("h1", null, "Hello from Elmoorx"),
    h("p", null, "Edit src/index.elmoorx.tsx and save."),
    Counter({})
  );
}
`
  );

  await writeFile(
    join(root, ".gitignore"),
    `node_modules/
dist/
.elmoorx-cache/
*.log
.DS_Store
`
  );

  await writeFile(
    join(root, "README.md"),
    `# ${name}

Built with [Elmoorx](https://elmoorx.dev) — build fast, run anywhere, stay secure.

## Get started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open http://localhost:3000
`
  );

  console.warn("  ✓ Project created");
  console.warn(`\n  Next steps:`);
  console.warn(`    cd ${name}`);
  console.warn(`    npm install`);
  console.warn(`    npm run dev\n`);
}
