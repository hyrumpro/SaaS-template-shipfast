// lib/logger.ts
// Production-ready logging utility

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warnings and errors
    if (this.isProduction) {
      return level === "warn" || level === "error";
    }
    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog("error")) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        } : error,
      };
      console.error(this.formatMessage("error", message, errorContext));

      // In production, you would send this to error tracking service
      // Example: Sentry.captureException(error);
    }
  }

  // Specific logging methods for common scenarios
  auth(action: string, userId?: string, success: boolean = true): void {
    this.info(`Auth: ${action}`, { userId, success, category: "auth" });
  }

  payment(action: string, details: Record<string, unknown>): void {
    this.info(`Payment: ${action}`, { ...details, category: "payment" });
  }

  database(operation: string, table: string, success: boolean): void {
    this.info(`DB: ${operation} on ${table}`, {
      table,
      operation,
      success,
      category: "database",
    });
  }

  api(method: string, endpoint: string, statusCode: number, duration?: number): void {
    const level = statusCode >= 400 ? "warn" : "info";
    this[level](`API: ${method} ${endpoint}`, {
      method,
      endpoint,
      statusCode,
      duration,
      category: "api",
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const log = logger;
export default logger;
