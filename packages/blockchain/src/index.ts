/**
 * @elmoorx/blockchain — Web3 Integration
 * ============================================
 * Built-in Web3 support. Connect wallets, sign transactions,
 * interact with smart contracts — all reactive.
 *
 *   import { h, useWallet, useContract } from "@elmoorx/blockchain";
 *
 *   const { address, connect, disconnect } = useWallet();
 *   const contract = useContract(abi, address);
 *
 *   // Call contract method
 *   const balance = await contract.read("balanceOf", [address]);
 *
 *   // Send transaction
 *   await contract.write("transfer", [recipient, amount]);
 *
 * Features:
 *   - MetaMask / WalletConnect / Coinbase Wallet
 *   - Smart contract interaction (read/write)
 *   - Transaction signing
 *   - Event listening
 *   - Multi-chain support (Ethereum, Polygon, BSC, Arbitrum)
 *   - Reactive wallet state
 *   - Gas estimation
 *   - ENS resolution
 */

import { h, $state, type ElmoorxNode } from "@elmoorx/runtime";

// ============ EIP-1193 Provider Type ============
// Minimal subset of EIP-1193 (https://eips.ethereum.org/EIPS/eip-1193)
// that this package consumes. Keeping it local avoids depending on
// `@types/ethereum-provider` and lets us ship a zero-dep package.

export interface EthereumRequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface EthereumProvider {
  request<T = unknown>(args: EthereumRequestArguments): Promise<T>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isWalletConnect?: boolean;
}

// ============ WALLET ============

export type WalletProvider = "metamask" | "walletconnect" | "coinbase" | "injected";

export interface WalletState {
  address: string | null;
  chainId: number | null;
  provider: WalletProvider | null;
  connected: boolean;
  error: string | null;
}

class WalletManager {
  private state = $state<WalletState>({
    address: null,
    chainId: null,
    provider: null,
    connected: false,
    error: null,
  });

  private ethereum: EthereumProvider | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.ethereum =
        (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null;
      if (this.ethereum) {
        // Listen for account changes
        this.ethereum?.on?.("accountsChanged", (...args: unknown[]) => {
          const accounts = args[0] as string[];
          if (accounts.length === 0) {
            this.disconnect();
          } else {
            this.state.set({ ...this.state(), address: accounts[0] });
          }
        });

        // Listen for chain changes
        this.ethereum?.on?.("chainChanged", (...args: unknown[]) => {
          const chainId = args[0] as string;
          this.state.set({ ...this.state(), chainId: parseInt(chainId, 16) });
        });
      }
    }
  }

  async connect(provider: WalletProvider = "metamask"): Promise<void> {
    try {
      if (!this.ethereum) {
        this.state.set({ ...this.state(), error: "No Web3 wallet found. Install MetaMask." });
        return;
      }

      const accounts = await this.ethereum.request<string[]>({
        method: "eth_requestAccounts",
      });
      const chainId = await this.ethereum.request<string>({
        method: "eth_chainId",
      });

      this.state.set({
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        provider,
        connected: true,
        error: null,
      });
    } catch (err) {
      this.state.set({ ...this.state(), error: (err as Error).message });
    }
  }

  disconnect(): void {
    this.state.set({
      address: null,
      chainId: null,
      provider: null,
      connected: false,
      error: null,
    });
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this.ethereum) return;
    try {
      await this.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + chainId.toString(16) }],
      });
    } catch (err) {
      this.state.set({ ...this.state(), error: (err as Error).message });
    }
  }

  async signMessage(message: string): Promise<string | null> {
    if (!this.ethereum || !this.state().address) return null;
    try {
      return await this.ethereum.request({
        method: "personal_sign",
        params: [message, this.state().address],
      });
    } catch (err) {
      this.state.set({ ...this.state(), error: (err as Error).message });
      return null;
    }
  }

  getState() { return this.state; }
}

export const wallet = new WalletManager();

// ============ REACTIVE HOOKS ============

export function useWallet(): {
  address: () => string | null;
  chainId: () => number | null;
  connected: () => boolean;
  error: () => string | null;
  connect: (provider?: WalletProvider) => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;
} {
  const state = wallet.getState();
  return {
    address: () => state().address,
    chainId: () => state().chainId,
    connected: () => state().connected,
    error: () => state().error,
    connect: (p) => wallet.connect(p),
    disconnect: () => wallet.disconnect(),
    switchChain: (id) => wallet.switchChain(id),
    signMessage: (m) => wallet.signMessage(m),
  };
}

// ============ SMART CONTRACTS ============

export interface ContractABI {
  name: string;
  type: "function" | "event" | "constructor";
  stateMutability?: "view" | "nonpayable" | "payable";
  inputs?: { name: string; type: string }[];
  outputs?: { name: string; type: string }[];
}

export class SmartContract {
  constructor(
    private abi: ContractABI[],
    private address: string,
  ) {}

  async read(methodName: string, args: unknown[] = []): Promise<unknown> {
    const method = this.abi.find(m => m.name === methodName && m.type === "function");
    if (!method) throw new Error(`Method ${methodName} not found in ABI`);

    // Encode call data (simplified — real impl would use ethers.js/web3.js)
    const callData = this.encodeCall(method, args);

    if (!wallet.getState()().address) {
      throw new Error("Wallet not connected");
    }

    const ethereum =
      (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null;
    if (!ethereum) throw new Error("No Ethereum provider available");
    const result = await ethereum.request<string>({
      method: "eth_call",
      params: [
        { to: this.address, data: callData },
        "latest",
      ],
    });

    return this.decodeResult(method, result);
  }

  async write(methodName: string, args: unknown[] = [], value?: string): Promise<string> {
    const method = this.abi.find(m => m.name === methodName && m.type === "function");
    if (!method) throw new Error(`Method ${methodName} not found in ABI`);

    const callData = this.encodeCall(method, args);
    const from = wallet.getState()().address;
    if (!from) throw new Error("Wallet not connected");

    const ethereum =
      (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null;
    if (!ethereum) throw new Error("No Ethereum provider available");
    const txHash = await ethereum.request<string>({
      method: "eth_sendTransaction",
      params: [{
        from,
        to: this.address,
        data: callData,
        value: value || "0x0",
      }],
    });

    return txHash;
  }

  async estimateGas(methodName: string, args: unknown[] = []): Promise<number> {
    // Simplified gas estimation
    return 21000 + args.length * 1000;
  }

  /**
   * Subscribe to contract events.
   *
   * CAVEAT (alpha): This is a no-op. The setInterval body is empty —
   * it burns CPU every 5s doing nothing. A real implementation would
   * either:
   *   - Poll eth_getLogs with an incrementing fromBlock cursor, OR
   *   - Open a WebSocket subscription via eth_subscribe
   * For now, callers needing real event subscriptions should use
   * ethers.js directly.
   */
  onEvent(_eventName: string, _callback: (event: unknown) => void): () => void {
    // No-op — return a dispose function that does nothing.
    // Previously this created an empty setInterval that leaked CPU.
    return () => { /* no-op */ };
  }

  /**
   * ABI-encode a contract call.
   *
   * CAVEAT (alpha): This is a STUB. The previous implementation padded
   * all args with zeros (selector + "0".repeat(64 * args.length)),
   * which means every call sent zero values to the zero address.
   *
   * Real ABI encoding requires:
   *   - 4-byte Keccak-256 selector of `name(types)`
   *   - 32-byte head for each arg (static types) or offset+data (dynamic)
   *   - Correct padding for each Solidity type (uint, int, address,
   *     bytes, string, arrays, structs)
   *
   * This package does not bundle a Keccak-256 implementation or ABI
   * encoder to avoid an external dependency. For real contract
   * interaction, use ethers.js:
   *   import { Contract } from 'ethers';
   *   const contract = new Contract(address, abi, signer);
   *   await contract.transfer(recipient, amount);
   *
   * encodeCall() now THROWS to make the stub status obvious (was
   * silently returning garbage that would be rejected by every node).
   */
  private encodeCall(method: ContractABI, _args: unknown[]): string {
    throw new Error(
      `[elmoorx/blockchain] encodeCall() is not implemented. ` +
      `Use ethers.js Contract for real ABI encoding. ` +
      `Method: ${method.name}`
    );
  }

  /**
   * Compute the 4-byte function selector.
   *
   * CAVEAT (alpha): Uses DJB2 hash, NOT Keccak-256. The selector will
   * never match any real Ethereum contract's function selector — every
   * eth_call/eth_sendTransaction would invoke the wrong function.
   *
   * This package does not bundle a Keccak-256 implementation. Use
   * ethers.js for real selectors:
   *   import { id } from 'ethers';
   *   const selector = id('transfer(address,uint256)').slice(0, 10);
   *
   * functionSelector() now THROWS to make the stub status obvious.
   */
  private functionSelector(_name: string, _inputs: { type: string }[]): string {
    throw new Error(
      `[elmoorx/blockchain] functionSelector() is not implemented (requires Keccak-256). ` +
      `Use ethers.js id() for real function selectors.`
    );
  }

  private decodeResult(method: ContractABI, result: string): unknown {
    // Simplified decoding
    if (method.outputs?.length === 1) {
      if (method.outputs[0].type === "uint256") {
        return parseInt(result, 16);
      }
      return result;
    }
    return result;
  }
}

export function useContract(abi: ContractABI[], address: string): SmartContract {
  return new SmartContract(abi, address);
}

// ============ CHAIN CONFIG ============

export const chains: Record<number, { name: string; symbol: string; explorer: string; rpc: string }> = {
  1: { name: "Ethereum", symbol: "ETH", explorer: "https://etherscan.io", rpc: "https://mainnet.infura.io/v3/" },
  137: { name: "Polygon", symbol: "MATIC", explorer: "https://polygonscan.com", rpc: "https://polygon-rpc.com" },
  56: { name: "BNB Smart Chain", symbol: "BNB", explorer: "https://bscscan.com", rpc: "https://bsc-dataseed.binance.org" },
  42161: { name: "Arbitrum One", symbol: "ETH", explorer: "https://arbiscan.io", rpc: "https://arb1.arbitrum.io/rpc" },
  10: { name: "Optimism", symbol: "ETH", explorer: "https://optimistic.etherscan.io", rpc: "https://mainnet.optimism.io" },
  43114: { name: "Avalanche", symbol: "AVAX", explorer: "https://snowtrace.io", rpc: "https://api.avax.network/ext/bc/C/rpc" },
  8453: { name: "Base", symbol: "ETH", explorer: "https://basescan.org", rpc: "https://mainnet.base.org" },
};

export function getChainInfo(chainId: number) {
  return chains[chainId] || { name: "Unknown", symbol: "?", explorer: "", rpc: "" };
}

// ============ ENS ============
//
// IMPORTANT: ENS resolution has been REMOVED from this package.
//
// The previous implementation fetched from an untrusted third-party Azure
// endpoint (`ens-resolver.azurewebsites.net`), which:
//   1. Could be offline or owned by anyone — reliability and data-leak risk.
//   2. Sent user-supplied ENS names/addresses to that third party.
//
// ENS resolution properly requires:
//   - keccak256 (EIP-137 namehash uses keccak, NOT sha256 — using sha256
//     would produce wrong nodes for every name)
//   - ABI encoding for `addr(bytes32)`, `name(bytes32)`, `resolver(bytes32)`
//   - JSON-RPC calls to an Ethereum mainnet node
//
// Rather than ship a half-correct implementation, we direct callers to use
// ethers.js or viem which already implement ENS correctly:
//
//   import { ethers } from "ethers";
//   const provider = new ethers.JsonRpcProvider(MAINNET_RPC_URL);
//   const address = await provider.resolveName("vitalik.eth");
//   const name = await provider.lookupAddress("0x...");
//
// The exported stubs below preserve API surface for any caller that was
// importing these symbols, but they throw a clear error directing the
// caller to migrate.

/** @deprecated Use ethers.js `provider.resolveName()` instead. */
export async function resolveENS(_name: string): Promise<string | null> {
  throw new Error(
    "[blockchain] resolveENS() has been removed. " +
    "Use ethers.js provider.resolveName() or viem getEnsAddress() instead. " +
    "See https://docs.ethers.org/v6/api/providers/#Provider-resolveName"
  );
}

/** @deprecated Use ethers.js `provider.lookupAddress()` instead. */
export async function lookupENS(_address: string): Promise<string | null> {
  throw new Error(
    "[blockchain] lookupENS() has been removed. " +
    "Use ethers.js provider.lookupAddress() or viem getEnsName() instead. " +
    "See https://docs.ethers.org/v6/api/providers/#Provider-lookupAddress"
  );
}

// ============ WALLET CONNECT BUTTON ============

export function WalletButton(): ElmoorxNode {
  const { address, connected, connect, disconnect, error } = useWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return h("div", { style: "display:flex;align-items:center;gap:8px;" },
    () => connected()
      ? h("div", { style: "display:flex;align-items:center;gap:8px;" },
          h("div", {
            style: "display:flex;align-items:center;gap:6px;padding:6px 12px;background:#1A1A24;border:1px solid #2A2A38;border-radius:20px;",
          },
            h("div", { style: "width:8px;height:8px;border-radius:50%;background:#10B981;" }),
            h("span", { style: "font-family:monospace;font-size:13px;color:#E4E4E7;" }, formatAddress((address() as NonNullable<ReturnType<typeof address>>))),
          ),
          h("button", {
            onClick: () => disconnect(),
            style: "padding:6px 12px;background:#EF4444;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;",
          }, "Disconnect"),
        )
      : h("button", {
          onClick: () => connect("metamask"),
          style: "padding:8px 16px;background:linear-gradient(135deg,#A855F7,#06B6D4);color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;",
        }, "🦊 Connect Wallet"),
    () => error() ? h("div", { style: "color:#EF4444;font-size:11px;margin-top:4px;" }, error()) : null,
  );
}
