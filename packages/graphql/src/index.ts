/**
 * @elmoorx/graphql — GraphQL Client + Server
 * ============================================
 * Query, mutate, and subscribe — all reactive.
 *
 *   import { useQuery, gql } from "@elmoorx/graphql";
 *   const { data, loading, error } = useQuery(gql`query { users { id name } }`);
 */

import { $state, $effect } from "@elmoorx/runtime";

// ============ GQL TAG ============

export function gql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? String(values[i]) : ""), "");
}

// ============ CLIENT ============

export interface GraphQLClientOptions {
  endpoint: string;
  headers?: Record<string, string>;
  cache?: boolean;
}

export interface QueryResult<T = unknown> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

class GraphQLClient {
  private endpoint: string;
  private headers: Record<string, string>;
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private cacheTTL = 60000;

  constructor(opts: GraphQLClientOptions) {
    this.endpoint = opts.endpoint;
    this.headers = opts.headers || {};
  }

  async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const cacheKey = JSON.stringify({ query, variables });
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) throw new Error(`GraphQL error: ${response.status}`);

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);

    this.cache.set(cacheKey, { data: json.data, timestamp: Date.now() });
    return json.data as T;
  }

  async mutate<T = unknown>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.headers },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data as T;
  }

  subscribe(query: string, variables: Record<string, unknown>, handler: (data: unknown) => void): () => void {
    // WebSocket subscription
    const ws = new WebSocket(this.endpoint.replace("http", "ws"));
    ws.onopen = () => ws.send(JSON.stringify({ type: "subscribe", query, variables }));
    ws.onmessage = (e) => { try { const data = JSON.parse(e.data); if (data.type === "data") handler(data.data); } catch {} };
    return () => { ws.send(JSON.stringify({ type: "unsubscribe" })); ws.close(); };
  }

  setHeader(key: string, value: string): void { this.headers[key] = value; }
  setAuthToken(token: string): void { this.headers["Authorization"] = `Bearer ${token}`; }
  clearCache(): void { this.cache.clear(); }
}

let defaultClient: GraphQLClient | null = null;

export function createGraphQLClient(opts: GraphQLClientOptions): GraphQLClient {
  const client = new GraphQLClient(opts);
  if (!defaultClient) defaultClient = client;
  return client;
}

export function getClient(): GraphQLClient {
  if (!defaultClient) throw new Error("No GraphQL client configured. Call createGraphQLClient first.");
  return defaultClient;
}

// ============ REACTIVE HOOKS ============

export function useQuery<T = unknown>(query: string, variables?: Record<string, unknown>): {
  data: () => T | null;
  error: () => Error | null;
  loading: () => boolean;
  refetch: () => Promise<void>;
} {
  const data = $state<T | null>(null);
  const error = $state<Error | null>(null);
  const loading = $state(true);

  const execute = async () => {
    loading.set(true);
    error.set(null);
    try {
      const result = await getClient().query<T>(query, variables);
      data.set(result);
    } catch (err) {
      error.set(err as Error);
    } finally {
      loading.set(false);
    }
  };

  $effect(() => { execute(); });

  return {
    data: () => data(),
    error: () => error(),
    loading: () => loading(),
    refetch: execute,
  };
}

export function useMutation<T = unknown>(mutation: string): {
  mutate: (variables?: Record<string, unknown>) => Promise<T>;
  data: () => T | null;
  error: () => Error | null;
  loading: () => boolean;
} {
  const data = $state<T | null>(null);
  const error = $state<Error | null>(null);
  const loading = $state(false);

  const mutate = async (variables?: Record<string, unknown>): Promise<T> => {
    loading.set(true);
    error.set(null);
    try {
      const result = await getClient().mutate<T>(mutation, variables);
      data.set(result);
      return result;
    } catch (err) {
      error.set(err as Error);
      throw err;
    } finally {
      loading.set(false);
    }
  };

  return { mutate, data: () => data(), error: () => error(), loading: () => loading() };
}

// ============ SCHEMA BUILDER (Server) ============

export interface GraphQLField {
  name: string;
  type: string;
  args?: Record<string, string>;
  resolve?: (parent: unknown, args: Record<string, unknown>) => unknown | Promise<unknown>;
}

export interface GraphQLType {
  name: string;
  fields: GraphQLField[];
}

export class GraphQLSchema {
  private types = new Map<string, GraphQLType>();
  private queries: GraphQLField[] = [];
  private mutations: GraphQLField[] = [];

  addType(type: GraphQLType): this { this.types.set(type.name, type); return this; }

  addQuery(field: GraphQLField): this { this.queries.push(field); return this; }
  addMutation(field: GraphQLField): this { this.mutations.push(field); return this; }

  build(): string {
    const typeDefs = [...this.types.values()].map(t =>
      `type ${t.name} {\n${t.fields.map(f => `  ${f.name}: ${f.type}`).join("\n")}\n}`
    ).join("\n\n");

    const queryDef = this.queries.length > 0
      ? `type Query {\n${this.queries.map(q => `  ${q.name}${q.args ? `(${Object.entries(q.args).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""}: ${q.type}`).join("\n")}\n}`
      : "";

    const mutationDef = this.mutations.length > 0
      ? `type Mutation {\n${this.mutations.map(m => `  ${m.name}${m.args ? `(${Object.entries(m.args).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""}: ${m.type}`).join("\n")}\n}`
      : "";

    return [typeDefs, queryDef, mutationDef].filter(Boolean).join("\n\n");
  }

  async execute(query: string, variables?: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Simplified query execution
    const result: Record<string, unknown> = {};

    for (const q of this.queries) {
      if (query.includes(q.name)) {
        result[q.name] = await q.resolve?.(null, variables || {});
      }
    }

    for (const m of this.mutations) {
      if (query.includes(m.name)) {
        result[m.name] = await m.resolve?.(null, variables || {});
      }
    }

    return result;
  }
}

export function createSchema(): GraphQLSchema { return new GraphQLSchema(); }
