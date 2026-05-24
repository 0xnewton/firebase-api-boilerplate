import {ForbiddenError} from "./errors";
import type {Middleware} from "./middleware";

export type CorsOptions = {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
};

export function createCorsMiddleware(options: CorsOptions = {}): Middleware {
  const allowedOrigins = options.allowedOrigins ?? [];
  const allowedMethods = options.allowedMethods ?? [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ];
  const allowedHeaders = options.allowedHeaders ?? [
    "Authorization",
    "Content-Type",
    "X-Request-Id",
  ];

  return async (context, next) => {
    const origin = context.request.headers.origin;
    const allowedOrigin = resolveAllowedOrigin(origin, allowedOrigins);

    if (allowedOrigin) {
      context.response.headers["Access-Control-Allow-Origin"] = allowedOrigin;
      context.response.headers.Vary = "Origin";
    } else if (origin && allowedOrigins.length) {
      throw new ForbiddenError("Origin is not allowed");
    }

    context.response.headers["Access-Control-Allow-Methods"] =
      allowedMethods.join(", ");
    context.response.headers["Access-Control-Allow-Headers"] =
      allowedHeaders.join(", ");

    if (options.allowCredentials) {
      context.response.headers["Access-Control-Allow-Credentials"] = "true";
    }

    if (context.request.method === "OPTIONS") {
      context.response.statusCode = 204;
      context.response.body = {};
      return;
    }

    await next();
  };
}

function resolveAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: string[]
): string | undefined {
  if (!origin) {
    return undefined;
  }

  if (allowedOrigins.includes("*")) {
    return origin;
  }

  return allowedOrigins.includes(origin) ? origin : undefined;
}
