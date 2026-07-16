/**
 * @elmoorx/logger — Advanced Logging System
 * ============================================
 * Leveled logging with transports, formatting, filtering.
 *
 *   import { logger } from "@elmoorx/logger";
 *   logger.info("Hello");
 *   logger.error("Oops", { code: 500 });
 *   logger.debug("Debug data", { userId: 123 });
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export type LogTransport = (entry: LogEntry) => void;

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
  context?: Record<string, unknown>;
  tags?: string[];
}

export interface LoggerOptions {
  level?: LogLevel;
  transports?: LogTransport[];
  context?: Record<string, unknown>;
  tags?: string[];
  colorize?: boolean;
  timestamp?: boolean;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "\x1b[90m", debug: "\x1b[36m", info: "\x1b[32m",
  warn: "\x1b[33m", error: "\x1b[31m", fatal: "\x1b[41m",
};

const RESET = "\x1b[0m";

export class Logger {
  private minLevel: LogLevel = "info";
  private transports: LogTransport[] = [];
  private context: Record<string, unknown> = {};
  private tags: string[] = [];
  private useColor: boolean = true;
  private useTimestamp: boolean = true;
  private logCount = 0;

  constructor(opts: LoggerOptions = {}) {
    if (opts.level) this.minLevel = opts.level;
    if (opts.transports) this.transports = opts.transports;
    if (opts.context) this.context = opts.context;
    if (opts.tags) this.tags = opts.tags;
    if (opts.colorize !== undefined) this.useColor = opts.colorize;
    if (opts.timestamp !== undefined) this.useTimestamp = opts.timestamp;

    // Default: console transport
    if (this.transports.length === 0) {
      this.transports.push(this.consoleTransport);
    }
  }

  private consoleTransport = (entry: LogEntry): void => {
    const time = this.useTimestamp ? new Date(entry.timestamp).toISOString() + " " : "";
    const level = this.useColor
      ? `${LEVEL_COLORS[entry.level]}${entry.level.toUpperCase().padEnd(5)}${RESET}`
      : entry.level.toUpperCase().padEnd(5);
    const msg = `${time}${level} ${entry.message}`;
    const data = entry.data !== undefined ? entry.data : "";

    switch (entry.level) {
      case "trace": console.info(msg, data); break;
      case "debug": console.info(msg, data); break;
      case "info": console.info(msg, data); break;
      case "warn": console.warn(msg, data); break;
      case "error": console.error(msg, data); break;
      case "fatal": console.error(msg, data); break;
    }
  };

  setLevel(level: LogLevel): void { this.minLevel = level; }
  addTransport(transport: LogTransport): void { this.transports.push(transport); }
  addTag(tag: string): void { this.tags.push(tag); }
  setContext(key: string, value: unknown): void { this.context[key] = value; }

  child(opts: LoggerOptions = {}): Logger {
    return new Logger({
      level: this.minLevel,
      transports: this.transports,
      context: { ...this.context, ...opts.context },
      tags: [...this.tags, ...(opts.tags || [])],
      colorize: this.useColor,
      timestamp: this.useTimestamp,
    });
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const entry: LogEntry = {
      level, message, data,
      timestamp: Date.now(),
      context: { ...this.context },
      tags: [...this.tags],
    };

    this.logCount++;
    for (const transport of this.transports) transport(entry);
  }

  trace(msg: string, data?: unknown): void { this.log("trace", msg, data); }
  debug(msg: string, data?: unknown): void { this.log("debug", msg, data); }
  info(msg: string, data?: unknown): void { this.log("info", msg, data); }
  warn(msg: string, data?: unknown): void { this.log("warn", msg, data); }
  error(msg: string, data?: unknown): void { this.log("error", msg, data); }
  fatal(msg: string, data?: unknown): void { this.log("fatal", msg, data); }

  getLogCount(): number { return this.logCount; }

  // Memory transport — store logs
  static memoryTransport(maxSize = 1000): { transport: LogTransport; getLogs: () => LogEntry[]; clear: () => void } {
    const logs: LogEntry[] = [];
    return {
      transport: (entry: LogEntry) => {
        logs.push(entry);
        if (logs.length > maxSize) logs.shift();
      },
      getLogs: () => logs,
      clear: () => logs.length = 0,
    };
  }

  // File transport (Node.js)
  static fileTransport(filepath: string): LogTransport {
    return (entry: LogEntry) => {
      // In Node.js, would use fs.appendFileSync
      // For browser, store in localStorage
      try {
        const key = `elmoorx:logs:${filepath}`;
        const existing = localStorage.getItem(key) || "";
        localStorage.setItem(key, existing + JSON.stringify(entry) + "\n");
      } catch {}
    };
  }

  // HTTP transport — send logs to server
  static httpTransport(url: string, batchSize = 10): LogTransport {
    let buffer: LogEntry[] = [];
    let timer: unknown = null;

    const flush = async () => {
      if (buffer.length === 0) return;
      const batch = [...buffer];
      buffer = [];
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: batch }),
        });
      } catch {}
    };

    return (entry: LogEntry) => {
      buffer.push(entry);
      if (buffer.length >= batchSize) {
        flush();
      } else if (!timer) {
        timer = setTimeout(() => { timer = null; flush(); }, 5000);
      }
    };
  }
}

export const logger = new Logger({ colorize: true, timestamp: true });

// Named loggers
const loggers = new Map<string, Logger>();
export function getLogger(name: string, opts?: LoggerOptions): Logger {
  if (!loggers.has(name)) loggers.set(name, new Logger({ ...opts, context: { logger: name, ...opts?.context } }));
  return (loggers.get(name) as NonNullable<ReturnType<typeof loggers.get>>);
}

// Log level filter helper
export function createLogFilter(minLevel: LogLevel): (entry: LogEntry) => boolean {
  return (entry: LogEntry) => LEVEL_PRIORITY[entry.level] >= LEVEL_PRIORITY[minLevel];
}
