import assert from "node:assert/strict";
import {test} from "@jest/globals";

import type {RequestContext} from "@app/backend-framework";
import {Logger} from "./logger";

const context: RequestContext = {
  serviceName: "test-api",
  stage: "test",
  requestId: "req-123",
  request: {
    method: "GET",
    path: "/health",
    headers: {},
    query: {},
    params: {},
    body: undefined,
    cookies: {},
  },
  response: {
    statusCode: 200,
    headers: {},
  },
};

test("creates structured log entries with request context", () => {
  const logger = new Logger(context);

  assert.deepEqual(logger.createEntry("INFO", "Health checked", {
    elapsedMs: 12,
  }), {
    severity: "INFO",
    message: "Health checked",
    elapsedMs: 12,
    context: {
      serviceName: "test-api",
      stage: "test",
      requestId: "req-123",
      method: "GET",
      path: "/health",
    },
  });
});

test("serializes exceptions into structured metadata", () => {
  const logger = new Logger(context);
  const error = new Error("Something broke");

  const entry = logger.createExceptionEntry("Request failed", error);

  assert.equal(entry.severity, "ERROR");
  assert.equal(entry.message, "Request failed");
  assert.deepEqual(entry.error, {
    name: "Error",
    message: "Something broke",
    stack: error.stack,
  });
});
