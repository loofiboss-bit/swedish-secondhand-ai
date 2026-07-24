type LogLevel = 'info' | 'debug' | 'warn' | 'error';

export interface DiagnosticEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: unknown;
}

const SENSITIVE_KEY =
  /secret|api.?key|authorization|credential|token|images?|file.?path|data.?url/i;
const SECRET_VALUE = /(AIza[\w-]{8,}|Bearer\s+\S+|sk-[\w-]{8,})/gi;
const IMAGE_DATA_VALUE = /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi;

export function sanitizeDiagnostic(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (value instanceof Error) {
    const code = 'code' in value ? String(value.code) : undefined;
    return { name: value.name, code };
  }
  if (typeof value === 'string') {
    return value
      .slice(0, 500)
      .replace(SECRET_VALUE, '[redacted]')
      .replace(IMAGE_DATA_VALUE, '[redacted-image]');
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeDiagnostic(entry, depth + 1));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .map(([key, nested]) => [
          key,
          SENSITIVE_KEY.test(key) ? '[redacted]' : sanitizeDiagnostic(nested, depth + 1),
        ]),
    );
  }
  return value;
}

class LoggerService {
  private readonly entries: DiagnosticEntry[] = [];

  private record(level: LogLevel, message: string, metadata?: unknown): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: String(sanitizeDiagnostic(message)),
      metadata: metadata === undefined ? undefined : sanitizeDiagnostic(metadata),
    } satisfies DiagnosticEntry;
    this.entries.push(entry);
    if (this.entries.length > 100) this.entries.shift();
    if (level === 'warn') console.warn(entry.message, entry.metadata);
    if (level === 'error') console.error(entry.message, entry.metadata);
  }

  info(message: string, metadata?: unknown): void {
    this.record('info', message, metadata);
  }

  debug(message: string, metadata?: unknown): void {
    this.record('debug', message, metadata);
  }

  warn(message: string, metadata?: unknown): void {
    this.record('warn', message, metadata);
  }

  error(message: string, metadata?: unknown): void {
    this.record('error', message, metadata);
  }

  getDiagnostics(): DiagnosticEntry[] {
    return structuredClone(this.entries);
  }
}

export const logger = new LoggerService();
