export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any) {
    console.log(`\x1b[36m${this.formatMessage('info', message, meta)}\x1b[0m`);
  }

  warn(message: string, meta?: any) {
    console.warn(`\x1b[33m${this.formatMessage('warn', message, meta)}\x1b[0m`);
  }

  error(message: string, meta?: any) {
    console.error(`\x1b[31m${this.formatMessage('error', message, meta)}\x1b[0m`);
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`\x1b[90m${this.formatMessage('debug', message, meta)}\x1b[0m`);
    }
  }
}

export const logger = new Logger();
