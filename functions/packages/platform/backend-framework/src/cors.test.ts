import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {createTestRequestContext} from "@app/testing";
import {ForbiddenError} from "./errors";
import {createCorsMiddleware} from "./cors";

test("sets CORS headers for allowed origins", async () => {
  const middleware = createCorsMiddleware({
    allowedOrigins: ["https://app.test"],
  });
  const context = createTestRequestContext({
    request: {
      headers: {
        origin: "https://app.test",
      },
    },
  });

  await middleware(context, async () => undefined);

  assert.equal(
    context.response.headers["Access-Control-Allow-Origin"],
    "https://app.test"
  );
  assert.equal(context.response.headers.Vary, "Origin");
});

test("rejects disallowed origins", async () => {
  const middleware = createCorsMiddleware({
    allowedOrigins: ["https://app.test"],
  });
  const context = createTestRequestContext({
    request: {
      headers: {
        origin: "https://evil.test",
      },
    },
  });

  await assert.rejects(
    () => middleware(context, async () => undefined),
    ForbiddenError
  );
});

test("handles CORS preflight without continuing", async () => {
  const middleware = createCorsMiddleware({
    allowedOrigins: ["*"],
  });
  const context = createTestRequestContext({
    request: {
      method: "OPTIONS",
      headers: {
        origin: "https://app.test",
      },
    },
  });
  let nextCalled = false;

  await middleware(context, async () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(context.response.statusCode, 204);
});
