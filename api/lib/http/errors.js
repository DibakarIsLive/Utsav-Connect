/**
 * Application error types shared by Route Handlers and services.
 *
 * This module is intentionally free of `server-only` so unit tests and
 * (later) Server Actions can import it directly.
 */

export class AppError extends Error {
  /**
   * @param {string} code      Stable machine-readable code, e.g. "NOT_FOUND".
   * @param {string} message   Safe, user-facing message.
   * @param {number} status    HTTP status code.
   * @param {unknown} [details] Optional safe details (validation issues etc.).
   * @param {Record<string, string>} [headers] Optional response headers.
   */
  constructor(code, message, status = 500, details = undefined, headers = undefined) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.headers = headers;
  }
}

export class ValidationError extends AppError {
  constructor(details, message = "The request contains invalid data.") {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required.") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = "The email or password is incorrect.") {
    super("INVALID_CREDENTIALS", message, 401);
    this.name = "InvalidCredentialsError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message = "Verify your email address before signing in.") {
    super("EMAIL_NOT_VERIFIED", message, 403);
    this.name = "EmailNotVerifiedError";
  }
}

export class AccountSuspendedError extends AppError {
  constructor(message = "This account is suspended. Contact an administrator.") {
    super("ACCOUNT_SUSPENDED", message, 403);
    this.name = "AccountSuspendedError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "The request conflicts with the current state.") {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class TokenInvalidError extends AppError {
  constructor(message = "This link is invalid.") {
    super("TOKEN_INVALID", message, 400);
    this.name = "TokenInvalidError";
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = "This link has expired. Request a new one.") {
    super("TOKEN_EXPIRED", message, 400);
    this.name = "TokenExpiredError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds = 60) {
    super("RATE_LIMITED", "Too many attempts. Try again later.", 429, undefined, {
      "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))),
    });
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
