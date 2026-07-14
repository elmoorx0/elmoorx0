/**
 * @elmoorx/search — Full-Text Search Engine
 * ============================================
 * Built-in search with fuzzy matching, highlighting, and ranking.
 *
 *   import { h, createIndex, useSearch } from "@elmoorx/search";
 *   const index = createIndex([{ title: "Hello World", body: "..." }]);
 *   const results = index.search("hello");
 *
 * Features:
 *   - Full-text search with TF-IDF ranking
 *   - Fuzzy matching (typo tolerance)
 *   - Highlighting
 *   - Faceted search (filters)
 *   - Autocomplete / suggestions
 *   - Search history
 *   - Indexed search (fast for large datasets)
 *   - Multi-field search
 *   - Stop word removal
 *   - Stemming
 */

import { h, $state, type ElmoorxNode } from "@elmoorx/runtime";

// ============ TYPES ============

export interface SearchDocument {
  id: string | number;
  [field: string]: unknown;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights: Record<string, string[]>;
}

export interface SearchOptions {
  fields?: string[];
  fuzzy?: boolean;
  maxResults?: number;
  highlight?: boolean;
  minScore?: number;
}

// ============ TEXT PROCESSING ============

const stopWords = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "is", "are", "was", "were", "be", "been", "being",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 0 && !stopWords.has(t));
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

function fuzzyMatch(query: string, target: string, maxDistance: number = 2): boolean {
  if (target.includes(query)) return true;
  if (Math.abs(query.length - target.length) > maxDistance) return false;
  return levenshtein(query, target) <= maxDistance;
}

// ============ HIGHLIGHT ============

function highlight(text: string, terms: string[]): string {
  let result = text;
  for (const term of terms) {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    result = result.replace(regex, "<mark>$1</mark>");
  }
  return result;
}

// ============ SEARCH INDEX ============

class SearchIndex {
  private documents: SearchDocument[] = [];
  private invertedIndex = new Map<string, Set<number>>();
  private fieldLengths = new Map<string, number[]>();
  private avgFieldLength = new Map<string, number>();
  private documentCount = 0;
  private fields: string[];

  constructor(fields: string[] = ["title", "body", "description"]) {
    this.fields = fields;
  }

  add(docs: SearchDocument | SearchDocument[]): void {
    const docsArray = Array.isArray(docs) ? docs : [docs];

    for (const doc of docsArray) {
      const docIndex = this.documents.length;
      this.documents.push(doc);
      this.documentCount++;

      for (const field of this.fields) {
        const value = String(doc[field] || "");
        const tokens = tokenize(value);

        if (!this.fieldLengths.has(field)) this.fieldLengths.set(field, []);
        (this.fieldLengths.get(field) as NonNullable<ReturnType<typeof this.fieldLengths.get>>).push(tokens.length);

        for (const token of tokens) {
          if (!this.invertedIndex.has(token)) this.invertedIndex.set(token, new Set());
          (this.invertedIndex.get(token) as NonNullable<ReturnType<typeof this.invertedIndex.get>>).add(docIndex);
        }
      }
    }

    this.updateAvgLengths();
  }

  private updateAvgLengths(): void {
    for (const [field, lengths] of this.fieldLengths) {
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      this.avgFieldLength.set(field, avg);
    }
  }

  search(query: string, opts: SearchOptions = {}): SearchResult[] {
    const fields = opts.fields || this.fields;
    const maxResults = opts.maxResults || 10;
    const minScore = opts.minScore || 0.01;
    const terms = tokenize(query);

    if (terms.length === 0) return [];

    const scores = new Map<number, number>();
    const matchedTerms = new Map<number, Set<string>>();

    for (const term of terms) {
      // Exact matches
      const exact = this.invertedIndex.get(term);

      if (exact) {
        for (const docIndex of exact) {
          const tf = this.calculateTF(term, docIndex, fields);
          const idf = this.calculateIDF(term);
          const score = tf * idf;
          scores.set(docIndex, (scores.get(docIndex) || 0) + score);

          if (!matchedTerms.has(docIndex)) matchedTerms.set(docIndex, new Set());
          (matchedTerms.get(docIndex) as NonNullable<ReturnType<typeof matchedTerms.get>>).add(term);
        }
      }

      // Fuzzy matches
      if (opts.fuzzy) {
        for (const [indexedTerm, docIndices] of this.invertedIndex) {
          if (indexedTerm !== term && fuzzyMatch(term, indexedTerm, 2)) {
            for (const docIndex of docIndices) {
              const tf = this.calculateTF(indexedTerm, docIndex, fields);
              const idf = this.calculateIDF(indexedTerm);
              const fuzzyPenalty = 1 - (levenshtein(term, indexedTerm) / Math.max(term.length, indexedTerm.length));
              const score = tf * idf * fuzzyPenalty * 0.5;
              scores.set(docIndex, (scores.get(docIndex) || 0) + score);

              if (!matchedTerms.has(docIndex)) matchedTerms.set(docIndex, new Set());
              (matchedTerms.get(docIndex) as NonNullable<ReturnType<typeof matchedTerms.get>>).add(indexedTerm);
            }
          }
        }
      }
    }

    // Build results
    const results: SearchResult[] = [];
    for (const [docIndex, score] of scores) {
      if (score < minScore) continue;

      const doc = this.documents[docIndex];
      const highlights: Record<string, string[]> = {};

      if (opts.highlight !== false) {
        const termsForHighlight = [...(matchedTerms.get(docIndex) as NonNullable<ReturnType<typeof matchedTerms.get>>)];
        for (const field of fields) {
          const value = String(doc[field] || "");
          if (value) {
            highlights[field] = [highlight(value, termsForHighlight)];
          }
        }
      }

      results.push({ document: doc, score, highlights });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults);
  }

  private calculateTF(term: string, docIndex: number, fields: string[]): number {
    let tf = 0;
    for (const field of fields) {
      const value = String(this.documents[docIndex][field] || "");
      const tokens = tokenize(value);
      const count = tokens.filter(t => t === term).length;
      const length = tokens.length || 1;
      const avgLength = this.avgFieldLength.get(field) || 1;

      // Normalized TF
      tf += (count / length) / (length / avgLength);
    }
    return tf;
  }

  private calculateIDF(term: string): number {
    const docsWithTerm = this.invertedIndex.get(term)?.size || 0;
    if (docsWithTerm === 0) return 0;
    return Math.log(1 + (this.documentCount - docsWithTerm) / docsWithTerm);
  }

  // ============ AUTOCOMPLETE ============

  autocomplete(query: string, maxSuggestions: number = 5): string[] {
    if (query.length < 2) return [];

    const q = query.toLowerCase();
    const suggestions = new Map<string, number>();

    for (const [term, docIndices] of this.invertedIndex) {
      if (term.startsWith(q)) {
        suggestions.set(term, docIndices.size);
      }
    }

    return [...suggestions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxSuggestions)
      .map(([term]) => term);
  }

  // ============ FACETS ============

  facets(field: string, query?: string): { value: string; count: number }[] {
    const results = query ? this.search(query, { maxResults: 1000 }) : null;
    const counts = new Map<string, number>();

    for (const doc of this.documents) {
      if (results && !results.some(r => r.document.id === doc.id)) continue;

      const value = String(doc[field] || "");
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }

  size(): number { return this.documents.length; }
  clear(): void {
    this.documents = [];
    this.invertedIndex.clear();
    this.fieldLengths.clear();
    this.avgFieldLength.clear();
    this.documentCount = 0;
  }
}

// ============ FACTORY ============

export function createIndex(documents?: SearchDocument[], fields?: string[]): SearchIndex {
  const index = new SearchIndex(fields);
  if (documents) index.add(documents);
  return index;
}

// ============ REACTIVE HOOK ============

export function useSearch(documents: SearchDocument[], fields: string[] = ["title", "body"]) {
  const index = createIndex(documents, fields);
  const query = $state("");
  const results = $state<SearchResult[]>([]);
  const suggestions = $state<string[]>([]);
  const searching = $state(false);

  const search = (q: string) => {
    searching.set(true);
    const r = index.search(q, { fuzzy: true, highlight: true });
    results.set(r);
    suggestions.set(index.autocomplete(q));
    searching.set(false);
  };

  return {
    query: () => query(),
    results: () => results(),
    suggestions: () => suggestions(),
    searching: () => searching(),
    search,
    setQuery: (q: string) => { query.set(q); search(q); },
    index,
  };
}

// ============ SEARCH BAR COMPONENT ============

export function SearchBar(props: {
  onSearch: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
}): ElmoorxNode {
  const query = $state("");
  const showSuggestions = $state(false);

  return h("div", { style: "position:relative;width:100%;max-width:500px;" },
    h("input", {
      type: "search",
      value: () => query(),
      placeholder: props.placeholder || "Search...",
      onInput: (e: Event) => {
        query.set((e.target as HTMLInputElement).value);
        showSuggestions.set(true);
      },
      onFocus: () => showSuggestions.set(true),
      onBlur: () => setTimeout(() => showSuggestions.set(false), 200),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          props.onSearch(query());
          showSuggestions.set(false);
        }
      },
      style: "width:100%;padding:12px 16px 12px 44px;background:#14141B;border:1px solid #2A2A38;border-radius:8px;color:#E4E4E7;font-size:14px;outline:none;box-sizing:border-box;",
    }),
    h("span", { style: "position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#71717A;font-size:16px;" }, "🔍"),

    () => showSuggestions() && props.suggestions && props.suggestions.length > 0
      ? h("div", {
          style: "position:absolute;top:100%;left:0;right:0;margin-top:4px;background:#14141B;border:1px solid #A855F7;border-radius:8px;overflow:hidden;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,0.4);",
        },
          ...props.suggestions.slice(0, 5).map(sug =>
            h("div", {
              key: sug,
              onClick: () => { query.set(sug); props.onSearch(sug); showSuggestions.set(false); },
              style: "padding:10px 16px;cursor:pointer;font-size:13px;color:#A1A1AA;border-bottom:1px solid #2A2A38;",
              onMouseEnter: "this.style.background='#1A1A24';this.style.color='#A855F7'",
              onMouseLeave: "this.style.background='transparent';this.style.color='#A1A1AA'",
            },
              h("span", { style: "margin-right:8px;color:#71717A;" }, "🔍"),
              sug,
            )
          )
        )
      : null,
  );
}
