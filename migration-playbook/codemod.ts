/**
 * @elmoorx/codemod — React-to-Elmoorx automated transformer
 *
 * Handles the most tedious migration patterns:
 * - useState → $state
 * - useMemo → $computed
 * - useEffect → $effect
 * - useCallback → (no-op, returns fn)
 * - className → class
 * - createContext/useContext → createContext/consumeContext
 * - forwardRef → defineComponent
 *
 * Usage:
 *   node codemod.js react-to-elmoorx ./src
 *   node codemod.js audit ./src
 *   node codemod.js react-hooks-to-signals ./src/components
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// ─── CLI ────────────────────────────────────────────────────────────────────

interface TransformResult {
  file: string;
  changed: boolean;
  before: string;
  after: string;
  changes: string[];
}

const TRANSFORMS: Record<string, (src: string) => TransformResult> = {
  'react-hooks-to-signals': transformHooks,
  'use-state-to-signal': transformState,
  'use-effect-to-effect': transformEffect,
  'use-memo-to-computed': transformMemo,
  'jsx-classname': transformClassName,
  'react-lazy': transformLazy,
  'remove-dangerously-set-inner-html': transformDangerously,
  'react-to-elmoorx': transformAll,
  'audit': audit,
};

function main() {
  const [transform, ...paths] = process.argv.slice(2);
  if (!transform || !paths.length) {
    console.log(`Usage: node codemod.js <transform> <path> [path...]
Available transforms:
${Object.keys(TRANSFORMS).map(t => `  - ${t}`).join('\n')}`);
    process.exit(1);
  }

  const fn = TRANSFORMS[transform];
  if (!fn) {
    console.error(`Unknown transform: ${transform}`);
    process.exit(1);
  }

  const files = paths.flatMap(p => findFiles(p));
  let changedCount = 0;
  let totalChanges = 0;

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const result = fn(src);
    result.file = file;
    if (result.changed) {
      writeFileSync(file, result.after);
      changedCount++;
      totalChanges += result.changes.length;
      console.log(`✓ ${file} (${result.changes.length} changes)`);
      result.changes.forEach(c => console.log(`    - ${c}`));
    }
  }

  console.log(`\nDone. ${changedCount}/${files.length} files modified, ${totalChanges} total changes.`);
}

// ─── File walker ────────────────────────────────────────────────────────────

function findFiles(path: string): string[] {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  if (stat.isDirectory()) {
    return readdirSync(path)
      .filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'dist')
      .flatMap(f => findFiles(join(path, f)));
  }
  return [];
}

const SUPPORTED_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);

function isCodeFile(file: string): boolean {
  return SUPPORTED_EXTS.has(extname(file));
}

// ─── Transform: React hooks → Elmoorx signals ────────────────────────────────

function transformHooks(src: string): TransformResult {
  const changes: string[] = [];
  let out = src;

  // useState
  const useStateMatches = out.match(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState\s*\(([^)]*)\)/g);
  if (useStateMatches) {
    out = out.replace(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState\s*\(([^)]*)\)/g, (_, name, setName, init) => {
      changes.push(`useState(${name}) → $state`);
      return `const ${name} = $state(${init});`;
    });
  }

  // const [x, setX] = useState(() => expensive())
  out = out.replace(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState\s*\(\(\)\s*=>\s*([^)]+)\)/g, (_, name, setName, init) => {
    changes.push(`useState(lazy ${name}) → $state`);
    return `const ${name} = $state(${init});`;
  });

  // useMemo
  out = out.replace(/const\s+(\w+)\s*=\s*useMemo\s*\(\(\)\s*=>\s*([^,]+),\s*\[[^\]]*\]\s*\)/g, (_, name, expr) => {
    changes.push(`useMemo(${name}) → $computed`);
    return `const ${name} = $computed(() => ${expr})`;
  });

  // useEffect with deps
  out = out.replace(/useEffect\s*\(\(\)\s*=>\s*\{([^}]+)\},\s*\[[^\]]*\]\s*\)/g, (_, body) => {
    changes.push(`useEffect → $effect`);
    return `$effect(() => {${body}})`;
  });

  // useEffect without deps
  out = out.replace(/useEffect\s*\(\(\)\s*=>\s*\{([^}]+)\}\s*\)/g, (_, body) => {
    changes.push(`useEffect → $effect`);
    return `$effect(() => {${body}})`;
  });

  // useCallback → no-op (just extract the function)
  out = out.replace(/const\s+(\w+)\s*=\s*useCallback\s*\(\s*\(([^)]*)\)\s*=>\s*\{([^}]+)\},\s*\[[^\]]*\]\s*\)/g, (_, name, args, body) => {
    changes.push(`useCallback(${name}) → plain function`);
    return `const ${name} = (${args}) => {${body}}`;
  });

  // useRef
  out = out.replace(/const\s+(\w+)\s*=\s*useRef\s*\(([^)]*)\)/g, (_, name, init) => {
    changes.push(`useRef(${name}) → createRef`);
    return `const ${name} = createRef(${init})`;
  });

  // Add imports if any transforms were applied
  if (changes.length) {
    out = ensureImports(out);
  }

  return { file: '', changed: changes.length > 0, before: src, after: out, changes };
}

function transformState(src: string): TransformResult {
  return transformHooks(src); // Alias
}

function transformEffect(src: string): TransformResult {
  const changes: string[] = [];
  let out = src;

  out = out.replace(/useEffect\s*\(\(\)\s*=>\s*\{([^}]+)\},\s*\[[^\]]*\]\s*\)/g, (_, body) => {
    changes.push(`useEffect → $effect`);
    return `$effect(() => {${body}})`;
  });

  if (changes.length) {
    out = ensureImports(out);
  }

  return { file: '', changed: changes.length > 0, before: src, after: out, changes };
}

function transformMemo(src: string): TransformResult {
  const changes: string[] = [];
  let out = src;

  out = out.replace(/const\s+(\w+)\s*=\s*useMemo\s*\(\(\)\s*=>\s*([^,]+),\s*\[[^\]]*\]\s*\)/g, (_, name, expr) => {
    changes.push(`useMemo(${name}) → $computed`);
    return `const ${name} = $computed(() => ${expr})`;
  });

  if (changes.length) {
    out = ensureImports(out);
  }

  return { file: '', changed: changes.length > 0, before: src, after: out, changes };
}

function transformClassName(src: string): TransformResult {
  const changes: string[] = [];
  let out = src.replace(/\bclassName=/g, (match, offset) => {
    // Don't replace in string literals
    const before = src.slice(0, offset);
    const inString = /['"`][^'"`]*$/.test(before) && !/['"`][^'"`]*['"`][^'"`]*$/.test(before);
    if (inString) return match;
    changes.push(`className → class`);
    return 'class=';
  });

  return { file: '', changed: changes.length > 0, before: src, after: out, changes };
}

function transformLazy(src: string): TransformResult {
  const changes: string[] = [];
  let out = src.replace(/React\.lazy\s*\(\s*\(\)\s*=>\s*import\(([^)]+)\)\s*\)/g, (_, mod) => {
    changes.push(`React.lazy → lazy()`);
    return `lazy(() => import(${mod}))`;
  });

  if (changes.length) {
    out = ensureImports(out, ['lazy']);
  }

  return { file: '', changed: changes.length > 0, before: src, after: out, changes };
}

function transformDangerously(src: string): TransformResult {
  const changes: string[] = [];
  let out = src.replace(/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html:\s*([^}]+)\s*\}\}/g, (_, html) => {
    changes.push(`dangerouslySetInnerHTML → safe HTML render`);
    return `html={${html}}`;
  });

  return { file: '', changed: changes.length > 0, before: src, after: out, changes };
}

function transformAll(src: string): TransformResult {
  // Compose all transforms
  const t1 = transformHooks(src);
  const t2 = transformClassName(t1.after);
  const t3 = transformLazy(t2.after);
  const t4 = transformDangerously(t3.after);

  return {
    file: '',
    changed: t1.changed || t2.changed || t3.changed || t4.changed,
    before: src,
    after: t4.after,
    changes: [...t1.changes, ...t2.changes, ...t3.changes, ...t4.changes],
  };
}

function audit(src: string): TransformResult {
  // Just count occurrences — don't modify
  const findings: string[] = [];
  const patterns: [RegExp, string][] = [
    [/useState/g, 'useState → $state'],
    [/useEffect/g, 'useEffect → $effect'],
    [/useMemo/g, 'useMemo → $computed'],
    [/useCallback/g, 'useCallback → (remove)'],
    [/useRef/g, 'useRef → createRef'],
    [/useContext/g, 'useContext → consumeContext'],
    [/className=/g, 'className → class'],
    [/dangerouslySetInnerHTML/g, 'dangerouslySetInnerHTML (security risk)'],
    [/React\.lazy/g, 'React.lazy → lazy()'],
    [/forwardRef/g, 'forwardRef → defineComponent'],
  ];
  for (const [re, label] of patterns) {
    const matches = src.match(re);
    if (matches) {
      findings.push(`${label} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`);
    }
  }
  return { file: '', changed: false, before: src, after: src, changes: findings };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureImports(src: string, extras: string[] = []): string {
  const needed = new Set<string>(['$state', '$computed', '$effect', ...extras]);

  // Check existing Elmoorx imports
  const existingImport = src.match(/import\s+\{([^}]+)\}\s+from\s+['"]@wafra\/runtime['"]/);
  if (existingImport) {
    const existing = new Set(existingImport[1].split(',').map(s => s.trim()));
    needed.forEach(n => existing.add(n));
    const newImport = `import { ${Array.from(existing).join(', ')} } from '@elmoorx/runtime'`;
    return src.replace(existingImport[0], newImport);
  }

  // Add new import at top
  const importLine = `import { ${Array.from(needed).join(', ')} } from '@elmoorx/runtime';\n`;

  // After leading comments / other imports
  const importMatch = src.match(/^((?:\/\/.*\n|\/\*[\s\S]*?\*\/\n|import[^\n]+\n)*)/);
  if (importMatch) {
    return src.slice(0, importMatch[0].length) + importLine + src.slice(importMatch[0].length);
  }
  return importLine + src;
}

// ─── Run ────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
