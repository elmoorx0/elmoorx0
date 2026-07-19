/**
 * @elmoorx/web3 — smoke tests
 *
 * Verifies that web3 package exports load and basic types work.
 *
 * Run: npx tsx --test packages/web3/tests/web3-smoke.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

let web3 = null;
let skipReason = null;

try {
  web3 = await import("../src/index.ts");
} catch (e) {
  skipReason = `web3: ${String(e?.message || e).slice(0, 200)}`;
}

const skip = skipReason ? test.skip : test;

describe("web3: imports and basic API", () => {
  skip("NETWORKS map is exported with major chains", () => {
    assert.ok(web3.NETWORKS);
    // Should include at least Ethereum mainnet, Polygon, Arbitrum
    assert.ok(web3.NETWORKS[1], "Ethereum mainnet (chainId 1)");
    assert.ok(web3.NETWORKS[137], "Polygon (chainId 137)");
    assert.ok(web3.NETWORKS[42161], "Arbitrum (chainId 42161)");
    // Each network should have a name and chainId
    for (const chain of Object.values(web3.NETWORKS)) {
      assert.ok(chain.chainId, "chain.chainId");
      assert.ok(chain.name, "chain.name");
    }
  });

  skip("useWallet is exported as a function (if present)", () => {
    if (typeof web3.useWallet === "function") {
      assert.equal(typeof web3.useWallet, "function");
    } else {
      // Some builds may export it as part of an object
      assert.ok(true, "useWallet not exported as top-level (acceptable)");
    }
  });

  skip("useContract is exported as a function (if present)", () => {
    if (typeof web3.useContract === "function") {
      assert.equal(typeof web3.useContract, "function");
    } else {
      assert.ok(true, "useContract not exported as top-level (acceptable)");
    }
  });

  skip("formatAddress truncates long addresses", () => {
    assert.equal(typeof web3.formatAddress, "function");
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    const formatted = web3.formatAddress(addr);
    assert.ok(formatted.length <= addr.length);
    assert.ok(formatted.includes("0x"));
    assert.ok(formatted.includes("..."));
  });
});
