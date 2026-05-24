import type {Controller} from "./controller";
import type {RequestContext, RuntimeContext} from "./context";
import {
  HttpError,
  RouteNotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
import type {HttpMethod, RouteArgs} from "./http";
import {composeMiddlewares, Middleware} from "./middleware";
import {success} from "./response";
import {getRegisteredRoutes} from "./route";

export type HttpRequest = {
  method: string;
  path?: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  body?: unknown;
};

export type HttpResponse = {
  status(code: number): HttpResponse;
  set(headers: Record<string, string>): HttpResponse;
  json(body: unknown): void;
};

type ControllerClass = new () => Controller;

type RouterArgs = {
  context: RuntimeContext;
  controllers: ControllerClass[];
  middlewares?: Middleware[];
};

type RouteEntry = ReturnType<typeof getRegisteredRoutes>[number] & {
  controller: ControllerClass;
};

type RouteMatch = {
  route: RouteEntry;
  params: Record<string, string>;
};

type ControllerMethod = (args: unknown) => unknown | Promise<unknown>;

export function createHttpRouter({
  context,
  controllers,
  middlewares = [],
}: RouterArgs) {
  const routes = controllers.reduce<RouteEntry[]>(
    (registeredRoutes, controller) => [
      ...registeredRoutes,
      ...getRegisteredRoutes(controller.prototype).map((route) => ({
        ...route,
        controller,
      })),
    ],
    []
  );

  return async (
    request: HttpRequest,
    response: HttpResponse
  ): Promise<void> => {
    const requestContext = buildRequestContext(context, request);
    const routeMatch = matchRoute(
      routes,
      requestContext.request.method,
      requestContext.request.path
    );

    try {
      await composeMiddlewares([
        ...middlewares,
        buildRouteMiddleware(routeMatch),
      ])(requestContext);

      response
        .status(requestContext.response.statusCode)
        .set(requestContext.response.headers)
        .json(requestContext.response.body ?? {});
    } catch (error) {
      const resolvedError = normalizeError(error);
      response
        .status(resolvedError.statusCode)
        .set(requestContext.response.headers)
        .json({
          code: resolvedError.code,
          message: resolvedError.message,
          data: resolvedError.data,
        });
    }
  };
}

function buildRouteMiddleware(
  routeMatch: RouteMatch | undefined
): Middleware {
  return async (context) => {
    if (!routeMatch) {
      throw new RouteNotFoundError(
        context.request.method,
        context.request.path
      );
    }

    const {route, params} = routeMatch;
    const controller = new route.controller();
    context.request.params = params;
    const routeArgs = buildRouteArgs(route, context);

    if (route.authenticated) {
      if (!context.authToken || !context.claims) {
        throw new UnauthorizedError();
      }

      routeArgs.token = context.authToken;
      routeArgs.claims = context.claims;
    }

    await controller.initialize(context);

    const candidate = (controller as unknown as Record<string, unknown>)[
      route.propertyKey
    ];
    if (typeof candidate !== "function") {
      throw new Error(`Route handler ${route.propertyKey} is not callable`);
    }

    const handler = candidate as ControllerMethod;
    const data = await handler.call(controller, routeArgs);
    context.response.body = success(data);
    context.response.statusCode = route.successStatusCode ?? 200;
  };
}

function buildRouteArgs(route: RouteEntry, context: RequestContext) {
  try {
    const routeArgs: RouteArgs = {
      payload: route.payloadSchema?.parse(context.request.body),
      pathParams: route.pathParamsSchema?.parse(context.request.params),
      queryParams: route.queryParamsSchema?.parse(context.request.query),
    };

    return routeArgs;
  } catch (error) {
    throw new ValidationError(error);
  }
}

function buildRequestContext(
  runtime: RuntimeContext,
  request: HttpRequest
): RequestContext {
  const headers = normalizeHeaders(request.headers);
  const path = normalizePath(request.path ?? request.url.split("?")[0] ?? "/");
  const requestId = headers["x-request-id"] ?? createRequestId();

  return {
    ...runtime,
    requestId,
    authToken: getBearerToken(headers.authorization),
    request: {
      method: request.method.toUpperCase() as HttpMethod,
      path,
      headers,
      query: request.query ?? {},
      params: {},
      body: request.body,
      cookies: parseCookies(headers.cookie),
      ip: getClientIp(headers),
      userAgent: headers["user-agent"],
    },
    response: {
      statusCode: 404,
      headers: {
        "X-Request-Id": requestId,
      },
    },
  };
}

function matchRoute(
  routes: RouteEntry[],
  method: HttpMethod,
  path: string
): RouteMatch | undefined {
  for (const route of routes) {
    const params = matchPath(route.path, path);
    if (route.method === method && params) {
      return {
        route,
        params,
      };
    }
  }

  return undefined;
}

function matchPath(
  pattern: string,
  path: string
): Record<string, string> | undefined {
  const patternParts = normalizePath(pattern).split("/").filter(Boolean);
  const pathParts = normalizePath(path).split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return undefined;
  }

  return patternParts.reduce<Record<string, string> | undefined>(
    (params, patternPart, index) => {
      if (!params) {
        return undefined;
      }

      const pathPart = pathParts[index];
      if (patternPart.startsWith(":")) {
        params[patternPart.slice(1)] = decodeURIComponent(pathPart);
        return params;
      }

      return patternPart === pathPart ? params : undefined;
    },
    {}
  );
}

function normalizePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.length > 1 && normalized.endsWith("/") ?
    normalized.slice(0, -1) :
    normalized;
}

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string | undefined> {
  return Object.entries(headers).reduce<Record<string, string | undefined>>(
    (normalized, [key, value]) => {
      normalized[key.toLowerCase()] = Array.isArray(value) ?
        value.join(",") :
        value;
      return normalized;
    },
    {}
  );
}

function getBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

function getClientIp(
  headers: Record<string, string | undefined>
): string | undefined {
  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }

  return headers["x-real-ip"];
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return header.split(";").reduce<Record<string, string>>((cookies, item) => {
    const [key, value] = item.split("=");
    if (key && value) {
      cookies[key.trim()] = value.trim();
    }
    return cookies;
  }, {});
}

function normalizeError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  return new HttpError(message, 500, "INTERNAL_ERROR");
}

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
