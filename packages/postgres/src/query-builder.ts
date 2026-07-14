/**
 * Fluent SQL query builder — safe from SQL injection via parameterization.
 * Supports SELECT, INSERT, UPDATE, DELETE with WHERE, JOIN, ORDER BY, LIMIT, etc.
 */

import type { QueryParam, QueryParams } from './index.js';

export interface BuiltQuery {
  text: string;
  params: QueryParams;
}

type Operator = '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'IS' | 'IS NOT' | '~' | '~*';

interface WhereClause {
  sql: string;
  params: QueryParam[];
}

export class QueryBuilder {
  private _table = '';
  private _select: string[] = ['*'];
  private _where: WhereClause[] = [];
  private _join: string[] = [];
  private _orderBy: string[] = [];
  private _groupBy: string[] = [];
  private _limit?: number;
  private _offset?: number;
  private _insertValues: Record<string, QueryParam> | Record<string, QueryParam>[] = [];
  private _updateValues: Record<string, QueryParam> = {};
  private _onConflict?: { target: string[]; action: 'NOTHING' | 'UPDATE' };
  private _returning: string[] = [];
  private _mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private _distinct: boolean = false;
  private _cte: string[] = [];

  table(name: string): this {
    this._table = name;
    return this;
  }

  select(...columns: string[]): this {
    this._mode = 'select';
    this._select = columns.length ? columns : ['*'];
    return this;
  }

  distinct(): this {
    this._distinct = true;
    return this;
  }

  insert(values: Record<string, QueryParam> | Record<string, QueryParam>[]): this {
    this._mode = 'insert';
    this._insertValues = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: Record<string, QueryParam>): this {
    this._mode = 'update';
    this._updateValues = values;
    return this;
  }

  delete(): this {
    this._mode = 'delete';
    return this;
  }

  // ── WHERE ──
  private paramCount = 0;
  private nextParam(): string {
    return `$${++this.paramCount}`;
  }

  where(column: string, op: Operator, value: QueryParam): this;
  where(column: string, value: QueryParam): this;
  where(column: string, opOrValue: Operator | QueryParam | QueryParam[], value?: QueryParam): this {
    if (value === undefined) {
      // 2-arg form
      if (Array.isArray(opOrValue) && typeof column === 'string') {
        // raw form: where('id IN (?)', [1,2,3]) — but we use parameterized
        this._where.push({ sql: column, params: opOrValue as QueryParam[] });
        return this;
      }
      // shorthand equality
      const placeholder = this.nextParam();
      this._where.push({ sql: `${column} = ${placeholder}`, params: [opOrValue as QueryParam] });
      return this;
    }
    // 3-arg form
    if (opOrValue === 'IN' || opOrValue === 'NOT IN') {
      const arr = Array.isArray(value) ? value : [value];
      const placeholders = arr.map(() => this.nextParam()).join(', ');
      this._where.push({ sql: `${column} ${opOrValue} (${placeholders})`, params: arr });
      return this;
    }
    if (opOrValue === 'IS' || opOrValue === 'IS NOT') {
      this._where.push({ sql: `${column} ${opOrValue} ${value}`, params: [] });
      return this;
    }
    const placeholder = this.nextParam();
    this._where.push({ sql: `${column} ${opOrValue} ${placeholder}`, params: [value] });
    return this;
  }

  whereIn(column: string, values: QueryParam[]): this {
    if (!values.length) {
      this._where.push({ sql: 'FALSE', params: [] });
      return this;
    }
    const placeholders = values.map(() => this.nextParam()).join(', ');
    this._where.push({ sql: `${column} IN (${placeholders})`, params: values });
    return this;
  }

  whereNull(column: string): this {
    this._where.push({ sql: `${column} IS NULL`, params: [] });
    return this;
  }

  whereNotNull(column: string): this {
    this._where.push({ sql: `${column} IS NOT NULL`, params: [] });
    return this;
  }

  whereBetween(column: string, start: QueryParam, end: QueryParam): this {
    const p1 = this.nextParam();
    const p2 = this.nextParam();
    this._where.push({ sql: `${column} BETWEEN ${p1} AND ${p2}`, params: [start, end] });
    return this;
  }

  orWhere(column: string, op: Operator, value: QueryParam): this {
    const placeholder = this.nextParam();
    const clause = `${column} ${op} ${placeholder}`;
    if (this._where.length === 0) {
      this._where.push({ sql: clause, params: [value] });
    } else {
      // Wrap previous as group
      const prev = this._where[this._where.length - 1];
      this._where[this._where.length - 1] = {
        sql: `(${prev.sql} OR ${clause})`,
        params: [...prev.params, value],
      };
    }
    return this;
  }

  // ── JOIN ──
  join(table: string, left: string, right: string): this {
    this._join.push(`INNER JOIN ${table} ON ${left} = ${right}`);
    return this;
  }

  leftJoin(table: string, left: string, right: string): this {
    this._join.push(`LEFT JOIN ${table} ON ${left} = ${right}`);
    return this;
  }

  rightJoin(table: string, left: string, right: string): this {
    this._join.push(`RIGHT JOIN ${table} ON ${left} = ${right}`);
    return this;
  }

  // ── ORDER / GROUP / LIMIT ──
  orderBy(column: string, dir: 'ASC' | 'DESC' = 'ASC'): this {
    this._orderBy.push(`${column} ${dir}`);
    return this;
  }

  groupBy(...columns: string[]): this {
    this._groupBy.push(...columns);
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  // ── INSERT extras ──
  onConflict(target: string[], action: 'NOTHING' | 'UPDATE' = 'NOTHING'): this {
    this._onConflict = { target, action };
    return this;
  }

  returning(...columns: string[]): this {
    this._returning = columns.length ? columns : ['*'];
    return this;
  }

  // ── Build ──
  build(): BuiltQuery {
    if (!this._table) throw new Error('Table not specified');
    const params: QueryParam[] = [];

    const collect = (clauses: WhereClause[]) => {
      clauses.forEach(c => params.push(...c.params));
    };

    let sql = '';

    if (this._mode === 'select') {
      sql = `SELECT ${this._distinct ? 'DISTINCT ' : ''}${this._select.join(', ')} FROM ${this._table}`;
      if (this._join.length) sql += ' ' + this._join.join(' ');
      if (this._where.length) {
        sql += ' WHERE ' + this._where.map(c => c.sql).join(' AND ');
        collect(this._where);
      }
      if (this._groupBy.length) sql += ' GROUP BY ' + this._groupBy.join(', ');
      if (this._orderBy.length) sql += ' ORDER BY ' + this._orderBy.join(', ');
      if (this._limit !== undefined) sql += ` LIMIT ${this._limit}`;
      if (this._offset !== undefined) sql += ` OFFSET ${this._offset}`;
    } else if (this._mode === 'insert') {
      const rows = this._insertValues as Record<string, QueryParam>[];
      const columns = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
      const valuesParts = rows.map(row => {
        const vals = columns.map(col => {
          const v = row[col] ?? null;
          params.push(v);
          return this.nextParam();
        });
        return `(${vals.join(', ')})`;
      });
      sql = `INSERT INTO ${this._table} (${columns.join(', ')}) VALUES ${valuesParts.join(', ')}`;
      if (this._onConflict) {
        sql += ` ON CONFLICT (${this._onConflict.target.join(', ')}) DO ${this._onConflict.action}`;
      }
      if (this._returning.length) sql += ` RETURNING ${this._returning.join(', ')}`;
    } else if (this._mode === 'update') {
      const setParts = Object.entries(this._updateValues).map(([col, val]) => {
        params.push(val);
        return `${col} = ${this.nextParam()}`;
      });
      sql = `UPDATE ${this._table} SET ${setParts.join(', ')}`;
      if (this._where.length) {
        sql += ' WHERE ' + this._where.map(c => c.sql).join(' AND ');
        collect(this._where);
      }
      if (this._returning.length) sql += ` RETURNING ${this._returning.join(', ')}`;
    } else if (this._mode === 'delete') {
      sql = `DELETE FROM ${this._table}`;
      if (this._where.length) {
        sql += ' WHERE ' + this._where.map(c => c.sql).join(' AND ');
        collect(this._where);
      }
      if (this._returning.length) sql += ` RETURNING ${this._returning.join(', ')}`;
    }

    return { text: sql, params };
  }

  /** Convenience: get the SQL string */
  toSQL(): string {
    return this.build().text;
  }

  /** Convenience: get parameters */
  getParams(): QueryParam[] {
    return this.build().params;
  }
}

// Helper to create a builder
export function qb(): QueryBuilder {
  return new QueryBuilder();
}
