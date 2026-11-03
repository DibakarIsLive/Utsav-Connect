/**
 * Database error types. Kept free of `server-only` and of the driver so the
 * HTTP layer and unit tests can import them without a database.
 */

export class DatabaseUnavailableError extends Error {
  constructor(message = "The database is currently unavailable.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}
