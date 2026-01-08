// lib/error-handler.ts
// Centralized error handling utility

export type ErrorType =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "rate_limit"
  | "payment"
  | "database"
  | "external_api"
  | "server"
  | "unknown";

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  statusCode: number;
  details?: unknown;
}

export class ApplicationError extends Error {
  type: ErrorType;
  userMessage: string;
  statusCode: number;
  details?: unknown;

  constructor(
    type: ErrorType,
    message: string,
    userMessage: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "ApplicationError";
    this.type = type;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Common error factories
export const Errors = {
  validation: (message: string, details?: unknown) =>
    new ApplicationError(
      "validation",
      message,
      "Please check your input and try again.",
      400,
      details
    ),

  authentication: (message: string = "Authentication failed") =>
    new ApplicationError(
      "authentication",
      message,
      "Please sign in to continue.",
      401
    ),

  authorization: (message: string = "Unauthorized access") =>
    new ApplicationError(
      "authorization",
      message,
      "You don't have permission to perform this action.",
      403
    ),

  notFound: (resource: string = "Resource") =>
    new ApplicationError(
      "not_found",
      `${resource} not found`,
      `The ${resource.toLowerCase()} you're looking for doesn't exist.`,
      404
    ),

  rateLimit: () =>
    new ApplicationError(
      "rate_limit",
      "Too many requests",
      "You're making too many requests. Please try again later.",
      429
    ),

  payment: (message: string, details?: unknown) =>
    new ApplicationError(
      "payment",
      message,
      "There was an issue processing your payment. Please try again or contact support.",
      402,
      details
    ),

  database: (message: string, details?: unknown) =>
    new ApplicationError(
      "database",
      message,
      "A database error occurred. Please try again later.",
      500,
      details
    ),

  externalApi: (service: string, details?: unknown) =>
    new ApplicationError(
      "external_api",
      `${service} API error`,
      "An external service is temporarily unavailable. Please try again later.",
      503,
      details
    ),

  server: (message: string = "Internal server error", details?: unknown) =>
    new ApplicationError(
      "server",
      message,
      "Something went wrong on our end. Please try again later.",
      500,
      details
    ),
};

// Error handler for API routes
export function handleApiError(error: unknown): {
  error: string;
  details?: unknown;
  statusCode: number;
} {
  if (error instanceof ApplicationError) {
    return {
      error: error.userMessage,
      details:
        process.env.NODE_ENV === "development" ? error.details : undefined,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "An unexpected error occurred",
      statusCode: 500,
    };
  }

  return {
    error: "An unexpected error occurred",
    statusCode: 500,
  };
}

// Type guard for checking if error is ApplicationError
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}
