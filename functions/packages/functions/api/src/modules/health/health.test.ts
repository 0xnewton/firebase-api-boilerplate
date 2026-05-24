import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {createHttpRouter} from "@app/backend-framework";
import {
  createTestHttpRequest,
  invokeTestRouter,
} from "@app/testing";
import {HealthController} from "./controllers";

test("mounts the health controller and serves health", async () => {
  const router = createHttpRouter({
    context: {
      serviceName: "test-api",
      stage: "test",
    },
    controllers: [HealthController],
  });

  const response = await invokeTestRouter(
    router,
    createTestHttpRequest({
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
