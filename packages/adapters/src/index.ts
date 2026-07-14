/**
 * Elmoorx Edge Adapters — public API
 * ============================================
 * One unified interface for all deployment targets.
 *
 *   import { adapters, deploy } from "@elmoorx/adapters";
 *   await deploy("cloudflare", { serverBundle, outPath });
 */

export { cloudflareAdapter, buildCloudflareWorker } from "./cloudflare.js";
export { vercelAdapter, buildVercelEdge } from "./vercel.js";
export { denoAdapter, buildDenoDeploy } from "./deno.js";
export { nodeAdapter, buildNodeServer } from "./node.js";

import { cloudflareAdapter } from "./cloudflare.js";
import { vercelAdapter } from "./vercel.js";
import { denoAdapter } from "./deno.js";
import { nodeAdapter } from "./node.js";

export const adapters = {
  cloudflare: cloudflareAdapter,
  vercel: vercelAdapter,
  deno: denoAdapter,
  node: nodeAdapter,
} as const;

export type AdapterName = keyof typeof adapters;

export async function deploy(
  target: AdapterName,
  opts: { serverBundle: string; outPath: string; port?: number }
): Promise<void> {
  const adapter = adapters[target];
  if (!adapter) {
    throw new Error(`Unknown adapter: ${target}. Available: ${Object.keys(adapters).join(", ")}`);
  }
  console.warn(`\n  Deploying to ${adapter.displayName}...\n`);
  await adapter.build(opts as unknown as Parameters<typeof adapter.build>[0]);
  console.warn(`\n  ✓ Deployed to ${adapter.displayName}`);
  console.warn(`  Memory limit: ${adapter.memoryLimit}`);
  console.warn(`  Cold start:   ${adapter.coldStart}\n`);
}
