import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {createTestRequestContext} from "@app/testing";
import {BaseService} from "./base-service";

class TestService extends BaseService {
  getContextRequestId(): string {
    return this.context.requestId;
  }

  createLogEntry() {
    return this.logger.createEntry("INFO", "Service tested");
  }
}

test("provides request context and logger to services", () => {
  const context = createTestRequestContext({
    requestId: "req-service-123",
  });
  const service = new TestService(context);

  assert.equal(service.getContextRequestId(), "req-service-123");
  assert.deepEqual(service.createLogEntry(), {
    severity: "INFO",
    message: "Service tested",
    context: {
      serviceName: "test-api",
      stage: "test",
      requestId: "req-service-123",
      method: context.request.method,
      path: context.request.path,
    },
  });
});
