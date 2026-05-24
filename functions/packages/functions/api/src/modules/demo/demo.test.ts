import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {createHttpRouter} from "@app/backend-framework";
import {
  createTestHttpRequest,
  invokeTestRouter,
} from "@app/testing";
import {DemoController} from "./controllers";

test("requires auth for the demo showcase route", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
      stage: "test",
    },
    controllers: [DemoController],
  });

  const response = await invokeTestRouter(
    router,
    createTestHttpRequest({
      method: "POST",
      url: "/demo/showcase",
      body: {
        name: "Demo",
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

test("validates the demo showcase payload before auth work", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
      stage: "test",
    },
    controllers: [DemoController],
  });

  const response = await invokeTestRouter(
    router,
    createTestHttpRequest({
      method: "POST",
      url: "/demo/showcase",
      body: {},
      headers: {
        authorization: "Bearer test-token",
      },
    })
  );

  assert.equal(response.statusCode, 422);
  assert.equal(getResponseCode(response.body), "VALIDATION_ERROR");
});

function getResponseCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("code" in body)) {
    return undefined;
  }

  return typeof body.code === "string" ? body.code : undefined;
}
