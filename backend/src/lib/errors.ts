// File: backend/src/lib/errors.ts
// Purpose: Define the application's typed error hierarchy.
// Functionality: Each subclass carries the HTTP status code and a short code
// string used by the global error handler to build a consistent JSON response.
// Role: Thrown by services and routes; consumed by the Fastify error handler
// in `src/index.ts` to produce uniform error payloads for the frontend.

// Base class for all expected application errors. Anything thrown that is not
// an AppError (or ZodError) is treated as an unexpected 500.
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// 400 — used when input fails domain validation beyond what Zod can express.
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

// 401 — missing or invalid session.
export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// 403 — authenticated but not permitted (e.g. non-admin hitting an admin route).
export class ForbiddenError extends AppError {
  constructor(message = 'No tenés permisos para esta acción') {
    super(message, 403, 'FORBIDDEN');
  }
}

// 404 — resource not found.
export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

// 409 — domain conflict, typically a unique constraint violation surfaced
// before hitting the DB (so the error message is user-friendly).
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

// 429 — login lockout (rule 4.9). Carries retry hint so the handler can set
// the standard `Retry-After` header in seconds.
export class TooManyRequestsError extends AppError {
  readonly retryAfterSeconds?: number;
  constructor(message: string, retryAfterSeconds?: number) {
    super(message, 429, 'TOO_MANY_REQUESTS');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
