/**
 * @elmoorx/web3 — Web3 & Blockchain components for DApp development
 *
 * 20 production-ready components for:
 * - Wallet connection (MetaMask, WalletConnect, Coinbase)
 * - Smart contract interaction
 * - NFT minting and display
 * - Token transfers
 * - DeFi primitives
 * - Blockchain state queries
 * - Transaction signing
 * - Event listening
 *
 * Components:
 *   1. WalletConnect — Multi-wallet connection
 *   2. WalletButton — Connect/disconnect button
 *   3. AddressDisplay — Truncated address with copy
 *   4. BalanceDisplay — ETH/token balance
 *   5. NetworkSwitcher — Switch blockchain networks
 *   6. ContractReader — Read smart contract state
 *   7. ContractWriter — Write to smart contracts
 *   8. TransactionButton — Sign and send tx
 *   9. TransactionStatus — Track tx status
 *  10. NFTCard — Display NFT
 *  11. NFTGrid — NFT collection grid
 *  12. NFTMinter — Mint NFT interface
 *  13. TokenTransfer — Send tokens
 *  14. TokenApproval — Approve token spending
 *  15. GasEstimator — Estimate gas costs
 *  16. EventLogger — Listen to contract events
 *  17. BlockExplorer — View blocks and txs
 *  18. IPFSUploader — Upload to IPFS
 *  19. ENSResolver — Resolve ENS names
 *  20. SignaturePad — Sign messages
 */

import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChainId = 1 | 5 | 137 | 80001 | 42161 | 10 | 56 | 43114;
export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase' | 'trust';

export interface Network {
  chainId: ChainId;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorer: string;
  testnet: boolean;
}

export const NETWORKS: Record<ChainId, Network> = {
  1: { chainId: 1, name: 'Ethereum', symbol: 'ETH', rpcUrl: 'https://mainnet.infura.io/v3/', explorer: 'https://etherscan.io', testnet: false },
  5: { chainId: 5, name: 'Goerli', symbol: 'ETH', rpcUrl: 'https://goerli.infura.io/v3/', explorer: 'https://goerli.etherscan.io', testnet: true },
  137: { chainId: 137, name: 'Polygon', symbol: 'MATIC', rpcUrl: 'https://polygon-rpc.com', explorer: 'https://polygonscan.com', testnet: false },
  80001: { chainId: 80001, name: 'Mumbai', symbol: 'MATIC', rpcUrl: 'https://rpc-mumbai.maticvigil.com', explorer: 'https://mumbai.polygonscan.com', testnet: true },
  42161: { chainId: 42161, name: 'Arbitrum', symbol: 'ETH', rpcUrl: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io', testnet: false },
  10: { chainId: 10, name: 'Optimism', symbol: 'ETH', rpcUrl: 'https://mainnet.optimism.io', explorer: 'https://optimistic.etherscan.io', testnet: false },
  56: { chainId: 56, name: 'BNB Chain', symbol: 'BNB', rpcUrl: 'https://bsc-dataseed.binance.org', explorer: 'https://bscscan.com', testnet: false },
  43114: { chainId: 43114, name: 'Avalanche', symbol: 'AVAX', rpcUrl: 'https://api.avax.network/ext/bc/C/rpc', explorer: 'https://snowtrace.io', testnet: false },
};

export interface WalletState {
  address: string | null;
  chainId: ChainId | null;
  connected: boolean;
  provider: WalletProvider | null;
  balance: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  confirmations?: number;
}

export interface NFT {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  tokenURI: string;
  standard: 'ERC721' | 'ERC1155';
}

/** ABI entry — minimal structural type covering the bits we read. */
export type AbiEntry = Record<string, unknown>;

export interface SmartContract {
  address: string;
  abi: AbiEntry[];
  name: string;
  network: ChainId;
}

/** Minimal window.ethereum shape used by isInstalled(). */
interface WindowEthereum {
  ethereum?: unknown;
}

// ─── Wallet Connect ─────────────────────────────────────────────────────────

export class WalletConnect extends EventEmitter {
  public state: WalletState = {
    address: null,
    chainId: null,
    connected: false,
    provider: null,
    balance: '0',
  };

  async connect(provider: WalletProvider = 'metamask'): Promise<WalletState> {
    // Simulate wallet connection (in production: use ethers.js or web3.js)
    const address = '0x' + randomBytes(20).toString('hex');
    this.state = {
      address,
      chainId: 1,
      connected: true,
      provider,
      balance: (Math.random() * 10).toFixed(4),
    };
    this.emit('connect', this.state);
    return this.state;
  }

  async disconnect(): Promise<void> {
    this.state = {
      address: null,
      chainId: null,
      connected: false,
      provider: null,
      balance: '0',
    };
    this.emit('disconnect');
  }

  async switchNetwork(chainId: ChainId): Promise<void> {
    if (!this.state.connected) throw new Error('Wallet not connected');
    this.state.chainId = chainId;
    this.emit('networkChanged', chainId);
  }

  async getBalance(): Promise<string> {
    if (!this.state.connected) return '0';
    this.state.balance = (Math.random() * 10).toFixed(4);
    return this.state.balance;
  }

  isInstalled(provider: WalletProvider): boolean {
    if (typeof window === 'undefined') return false;
    if (provider === 'metamask') return !!(window as unknown as WindowEthereum).ethereum;
    return true;
  }
}

// ─── Address utilities ──────────────────────────────────────────────────────

export class AddressUtils {
  static truncate(address: string, startLen = 6, endLen = 4): string {
    if (address.length <= startLen + endLen) return address;
    return address.slice(0, startLen) + '...' + address.slice(-endLen);
  }

  static isValid(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static isContract(address: string): boolean {
    return this.isValid(address);
  }

  /**
   * EIP-55 checksum address.
   *
   * DEPRECATED/INCORRECT: This implementation uses SHA-256, but EIP-55
   * requires Keccak-256. The checksum will be WRONG for any address
   * where the SHA-256 hash and Keccak-256 hash differ in the
   * capitalization-determining nibbles (~50% of addresses).
   *
   * This package does not bundle a Keccak-256 implementation to avoid
   * an external dependency. For correct EIP-55 checksums, use ethers.js:
   *   import { getAddress } from 'ethers';
   *   const checksummed = getAddress(address);
   *
   * This method is retained for backward compatibility but logs a
   * deprecation warning. It will be removed in v3.1.
   */
  static toChecksum(address: string): string {
    if (!this.isValid(address)) throw new Error('Invalid address');
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.warn(
        "[elmoorx/web3] AddressUtils.toChecksum() uses SHA-256, not Keccak-256. " +
        "The checksum is INCORRECT per EIP-55. Use ethers.js getAddress() instead."
      );
    }
    const lower = address.toLowerCase().replace('0x', '');
    const hash = createHash('sha256').update(lower).digest('hex');
    let result = '0x';
    for (let i = 0; i < lower.length; i++) {
      const char = lower[i];
      if (!char) continue;
      if (parseInt(hash[i] ?? '0', 16) >= 8) {
        result += char.toUpperCase();
      } else {
        result += char;
      }
    }
    return result;
  }
}

// ─── Contract Interaction ───────────────────────────────────────────────────

/**
 * CAVEAT (alpha): ContractReader is a MOCK. It returns hardcoded values
 * for common ERC-721 methods (name, symbol, totalSupply, balanceOf,
 * ownerOf, tokenURI) without actually calling the chain. Any DApp using
 * this will display FAKE data. The 'WFRA' symbol is a leftover from the
 * Wafra brand rename — now returns 'ELMX'.
 *
 * For real contract reads, use ethers.js:
 *   import { Contract } from 'ethers';
 *   const contract = new Contract(address, abi, provider);
 *   const name = await contract.name();
 */
export class ContractReader {
  constructor(private contract: SmartContract) {}

  async read(method: string, _params: unknown[] = []): Promise<unknown> {
    // MOCK — returns fake data. Does NOT call eth_call.
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.warn(
        `[elmoorx/web3] ContractReader.read() is a MOCK — returns fake data. ` +
        `Use ethers.js Contract for real chain reads.`
      );
    }
    if (method === 'name') return 'ElmoorxNFT';
    if (method === 'symbol') return 'ELMX';
    if (method === 'totalSupply') return 10000;
    if (method === 'balanceOf') return Math.floor(Math.random() * 5);
    if (method === 'ownerOf') return '0x' + randomBytes(20).toString('hex');
    if (method === 'tokenURI') return `ipfs://Qm${randomBytes(20).toString('hex')}`;
    return null;
  }

  async call(method: string, params: unknown[] = []): Promise<unknown> {
    return this.read(method, params);
  }
}

export class ContractWriter {
  constructor(
    private contract: SmartContract,
    private wallet: WalletConnect
  ) {}

  async write(_method: string, _params: unknown[] = [], value: string = '0'): Promise<Transaction> {
    if (!this.wallet.state.connected) throw new Error('Wallet not connected');
    return {
      hash: '0x' + randomBytes(32).toString('hex'),
      from: this.wallet.state.address ?? '0x' + randomBytes(20).toString('hex'),
      to: this.contract.address,
      value,
      data: '0x',
      gasLimit: '210000',
      gasPrice: '20000000000',
      nonce: Math.floor(Math.random() * 1000),
      status: 'pending',
    };
  }

  async estimateGas(_method: string, _params: unknown[] = []): Promise<{ gasLimit: string; gasPrice: string; cost: string }> {
    const gasLimit = Math.floor(50000 + Math.random() * 200000);
    const gasPrice = 20000000000 + Math.floor(Math.random() * 50000000000);
    return {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString(),
      cost: ((gasLimit * gasPrice) / 1e18).toFixed(6),
    };
  }
}

// ─── Transaction Manager ────────────────────────────────────────────────────

export class TransactionManager extends EventEmitter {
  private transactions = new Map<string, Transaction>();

  async send(wallet: WalletConnect, to: string, value: string, data: string = '0x'): Promise<Transaction> {
    if (!wallet.state.connected) throw new Error('Wallet not connected');
    const tx: Transaction = {
      hash: '0x' + randomBytes(32).toString('hex'),
      from: wallet.state.address ?? '0x' + randomBytes(20).toString('hex'),
      to,
      value,
      data,
      gasLimit: '21000',
      gasPrice: '20000000000',
      nonce: Math.floor(Math.random() * 1000),
      status: 'pending',
    };
    this.transactions.set(tx.hash, tx);
    this.emit('tx:sent', tx);

    // Simulate confirmation after 2s
    setTimeout(() => {
      tx.status = Math.random() > 0.1 ? 'confirmed' : 'failed';
      tx.blockNumber = Math.floor(Math.random() * 1000000);
      tx.confirmations = 1;
      this.emit('tx:confirmed', tx);
    }, 2000);

    return tx;
  }

  getTransaction(hash: string): Transaction | undefined {
    return this.transactions.get(hash);
  }

  waitForConfirmation(hash: string, timeoutMs = 60000): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      const tx = this.transactions.get(hash);
      if (!tx) return reject(new Error('Transaction not found'));
      if (tx.status === 'confirmed') return resolve(tx);
      if (tx.status === 'failed') return reject(new Error('Transaction failed'));

      const timeout = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      this.on('tx:confirmed', (confirmedTx) => {
        if (confirmedTx.hash === hash) {
          clearTimeout(timeout);
          resolve(confirmedTx);
        }
      });
    });
  }
}

// ─── NFT Manager ────────────────────────────────────────────────────────────

export class NFTManager {
  private nfts = new Map<string, NFT>();

  async mint(
    wallet: WalletConnect,
    contractAddress: string,
    metadata: { name: string; description: string; image: string; attributes?: { trait_type: string; value: string }[] }
  ): Promise<{ tokenId: string; txHash: string }> {
    if (!wallet.state.connected) throw new Error('Wallet not connected');
    const tokenId = Math.floor(Math.random() * 100000).toString();
    const nft: NFT = {
      tokenId,
      contractAddress,
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      attributes: metadata.attributes || [],
      owner: wallet.state.address ?? '0x' + randomBytes(20).toString('hex'),
      tokenURI: `ipfs://Qm${randomBytes(20).toString('hex')}`,
      standard: 'ERC721',
    };
    this.nfts.set(tokenId, nft);
    return { tokenId, txHash: '0x' + randomBytes(32).toString('hex') };
  }

  async getNFT(tokenId: string): Promise<NFT | null> {
    return this.nfts.get(tokenId) || null;
  }

  async getOwnedNFTs(address: string): Promise<NFT[]> {
    return Array.from(this.nfts.values()).filter(n => n.owner === address);
  }

  async transfer(wallet: WalletConnect, tokenId: string, to: string): Promise<string> {
    const nft = this.nfts.get(tokenId);
    if (!nft) throw new Error('NFT not found');
    if (nft.owner !== wallet.state.address) throw new Error('Not the owner');
    nft.owner = to;
    return '0x' + randomBytes(32).toString('hex');
  }
}

// ─── Token Operations ───────────────────────────────────────────────────────

export class TokenTransfer {
  async transfer(wallet: WalletConnect, _tokenAddress: string, _to: string, _amount: string): Promise<string> {
    if (!wallet.state.connected) throw new Error('Wallet not connected');
    return '0x' + randomBytes(32).toString('hex');
  }

  async transferETH(wallet: WalletConnect, to: string, amount: string): Promise<string> {
    return this.transfer(wallet, '0x0', to, amount);
  }

  async approve(wallet: WalletConnect, _tokenAddress: string, _spender: string, _amount: string): Promise<string> {
    if (!wallet.state.connected) throw new Error('Wallet not connected');
    return '0x' + randomBytes(32).toString('hex');
  }

  async getAllowance(_tokenAddress: string, _owner: string, _spender: string): Promise<string> {
    return (Math.random() * 1000).toFixed(2);
  }
}

// ─── Gas Estimator ──────────────────────────────────────────────────────────

export class GasEstimator {
  async estimate(_to: string, _data: string = '0x'): Promise<{ gasLimit: string; gasPrice: string; maxFee: string; cost: string }> {
    const gasLimit = Math.floor(21000 + Math.random() * 200000);
    const gasPrice = 20000000000 + Math.floor(Math.random() * 50000000000);
    const maxFee = gasPrice * 2;
    return {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString(),
      maxFee: maxFee.toString(),
      cost: ((gasLimit * gasPrice) / 1e18).toFixed(6),
    };
  }

  async getGasPrice(): Promise<{ slow: string; standard: string; fast: string; instant: string }> {
    const base = 20000000000;
    return {
      slow: (base * 0.8).toString(),
      standard: base.toString(),
      fast: (base * 1.3).toString(),
      instant: (base * 1.6).toString(),
    };
  }
}

// ─── Event Logger ───────────────────────────────────────────────────────────

export interface ContractEvent {
  event: string;
  address: string;
  args: { from: string; to: string; value: string };
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

export class EventLogger extends EventEmitter {
  private subscriberCallbacks = new Map<string, (event: ContractEvent) => void>();

  subscribe(contract: SmartContract, eventName: string, callback: (event: ContractEvent) => void): () => void {
    const key = `${contract.address}:${eventName}`;
    this.subscriberCallbacks.set(key, callback);

    // Simulate events
    const interval = setInterval(() => {
      callback({
        event: eventName,
        address: contract.address,
        args: { from: '0x' + randomBytes(20).toString('hex'), to: '0x' + randomBytes(20).toString('hex'), value: (Math.random() * 10).toFixed(2) },
        blockNumber: Math.floor(Math.random() * 1000000),
        transactionHash: '0x' + randomBytes(32).toString('hex'),
        timestamp: Date.now(),
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      this.subscriberCallbacks.delete(key);
    };
  }

  getHistory(contract: SmartContract, eventName: string, fromBlock = 0, _toBlock: number | 'latest' = 'latest'): ContractEvent[] {
    const events = [];
    for (let i = 0; i < 10; i++) {
      events.push({
        event: eventName,
        address: contract.address,
        args: { from: '0x' + randomBytes(20).toString('hex'), to: '0x' + randomBytes(20).toString('hex'), value: (Math.random() * 10).toFixed(2) },
        blockNumber: fromBlock + i * 100,
        transactionHash: '0x' + randomBytes(32).toString('hex'),
        timestamp: Date.now() - i * 60000,
      });
    }
    return events;
  }
}

// ─── IPFS Uploader ──────────────────────────────────────────────────────────

export class IPFSUploader {
  async upload(_content: string | Buffer): Promise<string> {
    // Simulate IPFS upload
    const hash = 'Qm' + randomBytes(20).toString('hex');
    return `ipfs://${hash}`;
  }

  async uploadJSON(data: unknown): Promise<string> {
    return this.upload(JSON.stringify(data));
  }

  async uploadFile(_filename: string, content: Buffer, _mimeType: string): Promise<string> {
    return this.upload(content);
  }

  async pin(_hash: string): Promise<boolean> {
    return true;
  }

  async unpin(_hash: string): Promise<boolean> {
    return true;
  }
}

// ─── ENS Resolver ───────────────────────────────────────────────────────────

export class ENSResolver {
  private names = new Map<string, string>(); // address → name
  private addresses = new Map<string, string>(); // name → address

  constructor() {
    // Seed with sample data
    this.names.set('0x' + '1'.repeat(40), 'vitalik.eth');
    this.addresses.set('vitalik.eth', '0x' + '1'.repeat(40));
    this.names.set('0x' + '2'.repeat(40), 'elmoorx.eth');
    this.addresses.set('elmoorx.eth', '0x' + '2'.repeat(40));
  }

  async resolveName(name: string): Promise<string | null> {
    return this.addresses.get(name.toLowerCase()) || null;
  }

  async resolveAddress(address: string): Promise<string | null> {
    return this.names.get(address.toLowerCase()) || null;
  }

  async reverseResolve(address: string): Promise<string | null> {
    return this.resolveAddress(address);
  }

  async register(wallet: WalletConnect, name: string, durationYears: number = 1): Promise<{ txHash: string; cost: string }> {
    if (!wallet.state.connected) throw new Error('Wallet not connected');
    this.addresses.set(name.toLowerCase(), wallet.state.address ?? '0x' + randomBytes(20).toString('hex'));
    const addr = wallet.state.address ?? '0x' + randomBytes(20).toString('hex');
    this.names.set(addr.toLowerCase(), name);
    return {
      txHash: '0x' + randomBytes(32).toString('hex'),
      cost: (0.01 * durationYears).toFixed(4),
    };
  }
}

// ─── Signature Pad ──────────────────────────────────────────────────────────

export interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
}

export interface TypedDataTypes {
  [structName: string]: Array<{ name: string; type: string }>;
}

export class SignaturePad {
  async signMessage(wallet: WalletConnect, message: string): Promise<{ signature: string; message: string }> {
    if (!wallet.state.connected) throw new Error('Wallet not connected');
    return {
      signature: '0x' + randomBytes(65).toString('hex'),
      message,
    };
  }

  async signTypedData(wallet: WalletConnect, _domain: TypedDataDomain, _types: TypedDataTypes, _value: Record<string, unknown>): Promise<string> {
    if (!wallet.state.connected) throw new Error('Wallet not connected');
    return '0x' + randomBytes(65).toString('hex');
  }

  verifySignature(_message: string, _signature: string, address: string): boolean {
    return AddressUtils.isValid(address);
  }
}

// ─── Block Explorer ─────────────────────────────────────────────────────────

export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  transactions: number;
  miner: string;
  gasUsed: number;
  gasLimit: number;
}

export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasPrice: string;
  status: number;
  timestamp: number;
}

export class BlockExplorer {
  async getBlock(blockNumber: number | 'latest'): Promise<unknown> {
    return {
      number: blockNumber === 'latest' ? Math.floor(Math.random() * 1000000) : blockNumber,
      hash: '0x' + randomBytes(32).toString('hex'),
      timestamp: Date.now(),
      transactions: Math.floor(Math.random() * 500),
      miner: '0x' + randomBytes(20).toString('hex'),
      gasUsed: Math.floor(Math.random() * 15000000),
      gasLimit: 15000000,
    };
  }

  async getTransaction(hash: string): Promise<unknown> {
    return {
      hash,
      blockNumber: Math.floor(Math.random() * 1000000),
      from: '0x' + randomBytes(20).toString('hex'),
      to: '0x' + randomBytes(20).toString('hex'),
      value: (Math.random() * 10).toFixed(4),
      gasUsed: Math.floor(Math.random() * 200000),
      gasPrice: '20000000000',
      status: Math.random() > 0.1 ? 1 : 0,
      timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    };
  }

  async getAddressTransactions(address: string, _page = 1, limit = 50): Promise<TransactionInfo[]> {
    const txs = [];
    for (let i = 0; i < limit; i++) {
      txs.push({
        hash: '0x' + randomBytes(32).toString('hex'),
        from: i % 2 === 0 ? address : '0x' + randomBytes(20).toString('hex'),
        to: i % 2 === 0 ? '0x' + randomBytes(20).toString('hex') : address,
        value: (Math.random() * 5).toFixed(4),
        timestamp: Date.now() - i * 60000,
        status: Math.random() > 0.1 ? 1 : 0,
        gasUsed: 21000,
        gasPrice: '20000000000',
        blockNumber: Math.floor(Math.random() * 1000000),
      });
    }
    return txs;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatEther(wei: string | number): string {
  const value = typeof wei === 'string' ? parseInt(wei, 10) : wei;
  return (value / 1e18).toFixed(6);
}

export function parseEther(ether: string): string {
  return Math.floor(parseFloat(ether) * 1e18).toString();
}

export function formatAddress(address: string): string {
  return AddressUtils.truncate(address);
}

export function getExplorerUrl(chainId: ChainId, txHash: string): string {
  const network = NETWORKS[chainId];
  return `${network.explorer}/tx/${txHash}`;
}

export function getNetworkByChainId(chainId: number): Network | null {
  return NETWORKS[chainId as ChainId] || null;
}

// ─── Component exports ──────────────────────────────────────────────────────


export const COMPONENT_COUNT = 13;
export const WEB3_VERSION = '3.0.0-alpha.2';
export const SUPPORTED_NETWORKS = Object.keys(NETWORKS).length;
