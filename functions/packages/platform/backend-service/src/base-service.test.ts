import assert from "node:assert/strict";
import {test} from "@jest/globals";

import type {AppDb, ExampleThingRepository} from "@app/db";
import {createTestRequestContext} from "@app/testing";
import {BaseService} from "./base-service";

class TestService extends BaseService {
  constructor(context: ConstructorParameters<typeof BaseService>[0]) {
    super(context, {
      exampleThings: {} as ExampleThingRepository,
    } satisfies AppDb);
  }

  getContextRequestId(): string {
    return this.context.requestId;
  }

  getDbKeys(): string[] {
    return Object.keys(this.db);
  }

  createLogEntry() {
    return this.logger.createEntry("INFO", "Service tested");
  }
}

test("provides request context, logger, and db to services", () => {
  const context = createTestRequestContext({
    requestId: "req-service-123",
  });
  const service = new TestService(context);

  assert.equal(service.getContextRequestId(), "req-service-123");
  assert.deepEqual(service.getDbKeys(), ["exampleThings"]);
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
