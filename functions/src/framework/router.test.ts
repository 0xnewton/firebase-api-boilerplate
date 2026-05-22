import assert from "node:assert/strict";
import test from "node:test";

import {
  Controller,
  createHttpRouter,
  HttpRequest,
  HttpResponse,
  HttpError,
  Route,
  RouteArgs,
  Schema,
} from "./index";
import {HealthController} from "../modules/health";

class TestResponse implements HttpResponse {
  statusCode = 0;
  headers: Record<string, string> = {};
  body: unknown;

  status(code: number): HttpResponse {
    this.statusCode = code;
    return this;
  }

  set(headers: Record<string, string>): HttpResponse {
    this.headers = {
      ...this.headers,
      ...headers,
    };
    return this;
  }

  json(body: unknown): void {
    this.body = body;
  }
}

function request(overrides: Partial<HttpRequest> = {}): HttpRequest {
  return {
    method: "GET",
    url: "/health",
    headers: {},
    query: {},
    ...overrides,
  };
}

async function invoke(
  router: ReturnType<typeof createHttpRouter>,
  req: HttpRequest
): Promise<TestResponse> {
  const response = new TestResponse();
  await router(req, response);
  return response;
}

const pathParamsSchema: Schema<{id: string}> = {
  parse(value: unknown) {
    assertRecord(value);
    const id = value.id;
    if (typeof id !== "string") {
      throw new Error("id is required");
    }
    return {id};
  },
};

const queryParamsSchema: Schema<{expand?: string}> = {
  parse(value: unknown) {
    assertRecord(value);
    const expand = value.expand;
    if (expand !== undefined && typeof expand !== "string") {
      throw new Error("expand must be a string");
    }
    return {expand};
  },
};

const payloadSchema: Schema<{name: string}> = {
  parse(value: unknown) {
    assertRecord(value);
    const name = value.name;
    if (typeof name !== "string") {
      throw new Error("name is required");
    }
    return {name};
  },
};

class ItemsController extends Controller {
  @Route({
    path: "/items/:id",
    method: "GET",
    pathParamsSchema,
    queryParamsSchema,
  })
  async getItem({
    pathParams,
    queryParams,
  }: RouteArgs<unknown, {id: string}, {expand?: string}>) {
    return {
      id: pathParams?.id,
      expand: queryParams?.expand,
    };
  }

  @Route({
    path: "/items",
    method: "POST",
    payloadSchema,
    successStatusCode: 201,
  })
  async createItem({payload}: RouteArgs<{name: string}>) {
    return {
      name: payload?.name,
    };
  }
}

class PrivateController extends Controller {
  @Route({
    path: "/private",
    method: "GET",
    authenticated: true,
  })
  async getPrivate({
    claims,
  }: RouteArgs<unknown, unknown, unknown, {sub: string}>) {
    return {
      sub: claims?.sub,
    };
  }
}

class ErrorController extends Controller {
  @Route({
    path: "/known-error",
    method: "GET",
  })
  async getKnownError() {
    throw new HttpError("Nope", 409, "CONFLICT", {
      reason: "already-exists",
    });
  }

  @Route({
    path: "/unknown-error",
    method: "GET",
  })
  async getUnknownError() {
    throw new Error("Boom");
  }
}

test("mounts a real module controller and serves health", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
      stage: "test",
    },
    controllers: [HealthController],
  });

  const response = await invoke(
    router,
    request({
      url: "/health",
      headers: {
        "x-request-id": "req-123",
      },
    })
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    code: "OK",
    message: "OK",
    data: {
      status: "ok",
      service: "test-api",
      requestId: "req-123",
    },
  });
  assert.equal(response.headers["X-Request-Id"], "req-123");
});

test("routes by method and path, then parses params and query", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
    },
    controllers: [ItemsController],
  });

  const response = await invoke(
    router,
    request({
      url: "/items/item-1",
      query: {
        expand: "details",
      },
    })
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    code: "OK",
    message: "OK",
    data: {
      id: "item-1",
      expand: "details",
    },
  });
});

test("uses route success status codes and validates payloads", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
    },
    controllers: [ItemsController],
  });

  const response = await invoke(
    router,
    request({
      method: "POST",
      url: "/items",
      body: {
        name: "Notebook",
      },
    })
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, {
    code: "OK",
    message: "OK",
    data: {
      name: "Notebook",
    },
  });
});

test("returns validation errors when schemas reject input", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
    },
    controllers: [ItemsController],
  });

  const response = await invoke(
    router,
    request({
      method: "POST",
      url: "/items",
      body: {},
    })
  );

  assert.equal(response.statusCode, 422);
  assert.deepEqual(response.body, {
    code: "VALIDATION_ERROR",
    message: "Invalid request",
    data: {
      message: "name is required",
    },
  });
});

test("returns 404 for missing routes", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
    },
    controllers: [ItemsController],
  });

  const response = await invoke(
    router,
    request({
      url: "/missing",
    })
  );

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, {
    code: "ROUTE_NOT_FOUND",
    message: "Route not found for GET /missing",
    data: undefined,
  });
});

test("protects authenticated routes and passes resolved claims", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
    },
    controllers: [PrivateController],
    authenticate: async (token: string): Promise<{sub: string}> => {
      assert.equal(token, "good-token");
      return {sub: "user-1"};
    },
  });

  const unauthorized = await invoke(
    router,
    request({
      url: "/private",
    })
  );

  assert.equal(unauthorized.statusCode, 401);
  assert.deepEqual(unauthorized.body, {
    code: "UNAUTHORIZED",
    message: "Unauthorized",
    data: undefined,
  });

  const authorized = await invoke(
    router,
    request({
      url: "/private",
      headers: {
        authorization: "Bearer good-token",
      },
    })
  );

  assert.equal(authorized.statusCode, 200);
  assert.deepEqual(authorized.body, {
    code: "OK",
    message: "OK",
    data: {
      sub: "user-1",
    },
  });
});

test("returns framework HTTP errors thrown from route handlers", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
    },
    controllers: [ErrorController],
  });

  const response = await invoke(
    router,
    request({
      url: "/known-error",
    })
  );

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, {
    code: "CONFLICT",
    message: "Nope",
    data: {
      reason: "already-exists",
    },
  });
});

test("returns normalized 500 errors for unexpected failures", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
    },
    controllers: [ErrorController],
  });

  const response = await invoke(
    router,
    request({
      url: "/unknown-error",
    })
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    code: "INTERNAL_ERROR",
    message: "Boom",
    data: undefined,
  });
});

function assertRecord(
  value: unknown
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected object");
  }
}
