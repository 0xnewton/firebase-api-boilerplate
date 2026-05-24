import assert from "node:assert/strict";
import {test} from "@jest/globals";

import type {AppDb, ExampleThingRepository} from "@app/db";
import type {AppStorage, AssetStore} from "@app/storage";
import {createTestRequestContext} from "@app/testing";
import {UnauthorizedError} from "@app/backend-framework";
import {BaseService} from "./base-service";

class TestService extends BaseService {
  constructor(context: ConstructorParameters<typeof BaseService>[0]) {
    const storage = {
      assets: {} as AssetStore,
    } satisfies AppStorage;

    super(context, {db: createTestDb(), storage});
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

  getOptionalUserId(): string | undefined {
    return this.getUserId();
  }

  getRequiredUserId(): string {
    return this.requireUserId();
  }
}

test("provides request context, logger, and db to services", () => {
  const context = createTestRequestContext({
    requestId: "req-service-123",
  });
  const service = new TestService(context);

  assert.equal(service.getContextRequestId(), "req-service-123");
  assert.deepEqual(service.getDbKeys(), ["exampleThings", "runTransaction"]);
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

test("provides auth helpers to services", () => {
  const context = createTestRequestContext({
    claims: {
      uid: "user-123",
    },
  });
  const service = new TestService(context);

  assert.equal(service.getOptionalUserId(), "user-123");
  assert.equal(service.getRequiredUserId(), "user-123");
});

test("throws when services require a missing user id", () => {
  const service = new TestService(createTestRequestContext());

  assert.throws(
    () => service.getRequiredUserId(),
    UnauthorizedError
  );
});

function createTestDb(): AppDb {
  const db: AppDb = {
    exampleThings: {} as ExampleThingRepository,
    runTransaction<T>(callback: (db: AppDb) => Promise<T>) {
      return callback(db);
    },
  };

  return db;
}
