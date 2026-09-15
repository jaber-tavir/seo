/**
 * Centralized application errors.
 * API handlers convert these into safe responses - stack traces and
 * internal messages never reach the client.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, status = 500, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, "VALIDATION_ERROR", 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, "CONFLICT", 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests, please try again later", public readonly retryAfterSeconds?: number) {
    super(message, "RATE_LIMITED", 429);
  }
}

export class ExternalApiError extends AppError {
  constructor(message = "An external service failed, please try again later", provider?: string) {
    super(message, "EXTERNAL_API_ERROR", 502, provider ? { provider } : undefined);
  }
}

export class DatabaseError extends AppError {
  constructor(message = "A database error occurred") {
    super(message, "DATABASE_ERROR", 500);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
