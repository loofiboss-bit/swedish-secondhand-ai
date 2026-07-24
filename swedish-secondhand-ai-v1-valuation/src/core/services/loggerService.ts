class LoggerService {
  info(message: string, metadata?: unknown): void {
    void message;
    void metadata;
    // Keep info logging silent by default in MVP.
  }

  debug(message: string, metadata?: unknown): void {
    void message;
    void metadata;
    // Keep debug logging silent by default in MVP.
  }

  warn(message: string, metadata?: unknown): void {
    console.warn(message, metadata);
  }

  error(message: string, metadata?: unknown): void {
    console.error(message, metadata);
  }
}

export const logger = new LoggerService();
