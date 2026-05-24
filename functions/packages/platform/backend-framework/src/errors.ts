export class HttpError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code = "HTTP_ERROR",
    readonly data?: unknown
  ) {
    super(message);
  }
}

export class RouteNotFoundError extends HttpError {
  constructor(method: string, path: string) {
    super(`Route not found for ${method} ${path}`, 404, "ROUTE_NOT_FOUND");
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found", code = "NOT_FOUND") {
    super(message, 404, code);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends HttpError {
  constructor(error: unknown) {
    super("Invalid request", 422, "VALIDATION_ERROR", toErrorData(error));
  }
}

function toErrorData(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  if (error && typeof error === "object") {
    return error as Record<string, unknown>;
  }

  return {
    message: String(error),
  };
}
