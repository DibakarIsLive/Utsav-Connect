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
   */
  constructor(code, message, status = 500, details = undefined) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
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

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}
