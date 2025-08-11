interface LogContext {
  jobId?: string;
  shopId?: string;
  operation?: string;
  [key: string]: any;
}

class Logger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  constructor() {
    // Set log level from environment variable
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
      this.logLevel = envLevel as any;
    }
  }

  private shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level as keyof typeof levels] >= levels[this.logLevel];
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  // Convenience methods for job-related logging
  jobInfo(jobId: string, message: string, context?: Omit<LogContext, 'jobId'>): void {
    this.info(message, { ...context, jobId });
  }

  jobWarn(jobId: string, message: string, context?: Omit<LogContext, 'jobId'>): void {
    this.warn(message, { ...context, jobId });
  }

  jobError(jobId: string, message: string, context?: Omit<LogContext, 'jobId'>): void {
    this.error(message, { ...context, jobId });
  }

  // Method to log performance metrics
  performance(operation: string, durationMs: number, context?: LogContext): void {
    this.info(`Performance: ${operation} took ${durationMs}ms`, { ...context, operation, durationMs });
  }

  // Method to log resource usage
  resourceUsage(type: 'memory' | 'cpu' | 'redis', usage: any, context?: LogContext): void {
    this.debug(`Resource usage - ${type}:`, { ...context, resourceType: type, usage });
  }
}

export const logger = new Logger();
