import assert from "node:assert/strict";
import {describe, test} from "@jest/globals";
import {
  createTestHttpRequest,
  invokeTestRouter,
} from "@app/testing";

import {Controller} from "./controller";
import {HttpError} from "./errors";
import type {RouteArgs, Schema} from "./http";
import {Route} from "./route";
import {createHttpRouter} from "./router";

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

describe("createHttpRouter", () => {
  describe("routing", () => {
    test("routes by method and path, then parses params and query",
      async () => {
        const router = createHttpRouter({
          context: {
            serviceName: "test-api",
          },
          controllers: [ItemsController],
        });

        const response = await invokeTestRouter(
          router,
          createTestHttpRequest({
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

    test("returns 404 for missing routes", async () => {
      const router = createHttpRouter({
        context: {
          serviceName: "test-api",
        },
        controllers: [ItemsController],
      });

      const response = await invokeTestRouter(
        router,
        createTestHttpRequest({
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
  });

  describe("responses and validation", () => {
    test("uses route success status codes and validates payloads", async () => {
      const router = createHttpRouter({
        context: {
          serviceName: "test-api",
        },
        controllers: [ItemsController],
      });

      const response = await invokeTestRouter(
        router,
        createTestHttpRequest({
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

      const response = await invokeTestRouter(
        router,
        createTestHttpRequest({
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
  });

  describe("authentication", () => {
    test("uses claims resolved by auth middleware", async () => {
      const router = createHttpRouter({
        context: {
          serviceName: "test-api",
        },
        controllers: [PrivateController],
        middlewares: [
          async (context, next) => {
            context.claims = {sub: "middleware-user"};
            await next();
          },
        ],
      });

      const response = await invokeTestRouter(
        router,
        createTestHttpRequest({
          url: "/private",
          headers: {
            authorization: "Bearer verified-token",
          },
        })
      );

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, {
        code: "OK",
        message: "OK",
        data: {
          sub: "middleware-user",
        },
      });
    });

    test("rejects authenticated routes without bearer tokens", async () => {
      const router = createHttpRouter({
        context: {
          serviceName: "test-api",
        },
        controllers: [PrivateController],
      });

      const response = await invokeTestRouter(
        router,
        createTestHttpRequest({
          url: "/private",
        })
      );

      assert.equal(response.statusCode, 401);
      assert.deepEqual(response.body, {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        data: undefined,
      });
    });

    test("rejects authenticated routes without verified claims", async () => {
      const router = createHttpRouter({
        context: {
          serviceName: "test-api",
        },
        controllers: [PrivateController],
      });

      const response = await invokeTestRouter(
        router,
        createTestHttpRequest({
          url: "/private",
          headers: {
            authorization: "Bearer unverified-token",
          },
        })
      );

      assert.equal(response.statusCode, 401);
      assert.deepEqual(response.body, {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        data: undefined,
      });
    });
  });

  describe("errors", () => {
    test("returns framework HTTP errors thrown from route handlers",
      async () => {
        const router = createHttpRouter({
          context: {
            serviceName: "test-api",
          },
          controllers: [ErrorController],
        });

        const response = await invokeTestRouter(
          router,
          createTestHttpRequest({
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

      const response = await invokeTestRouter(
        router,
        createTestHttpRequest({
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
  });
});

function assertRecord(
  value: unknown
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected object");
  }
}
