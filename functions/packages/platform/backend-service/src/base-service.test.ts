import assert from "node:assert/strict";
import {test} from "@jest/globals";

import type {AppDb, ExampleThingRepository} from "@app/db";
import type {AppStorage, AssetStore} from "@app/storage";
import {createTestRequestContext} from "@app/testing";
import {BaseService} from "./base-service";

class TestService extends BaseService {
  constructor(context: ConstructorParameters<typeof BaseService>[0]) {
    const db = {
      exampleThings: {} as ExampleThingRepository,
    } satisfies AppDb;
    const storage = {
      assets: {} as AssetStore,
    } satisfies AppStorage;

    super(context, db, storage);
  }

  getContextRequestId(): string {
    return this.context.requestId;
  }

  getDbKeys(): string[] {
    return Object.keys(this.db);
  }

  getStorageKeys(): string[] {
    return Object.keys(this.storage);
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
  assert.deepEqual(service.getStorageKeys(), ["assets"]);
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
