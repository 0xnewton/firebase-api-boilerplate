import assert from "node:assert/strict";
import {test} from "@jest/globals";

import type {AppDb, ExampleThing, ExampleThingRepository} from "@app/db";
import type {AppStorage, AssetMetadata, AssetStore} from "@app/storage";
import {createTestRequestContext} from "@app/testing";
import {DemoService} from "./demo-service";

test("creates a demo showcase", async () => {
  const context = createTestRequestContext({
    requestId: "req-demo-123",
    claims: {
      uid: "user-demo-1",
    },
    request: {
      ip: "203.0.113.10",
      userAgent: "Demo Test Agent",
    },
  });
  const service = new DemoService(context, {
    db: createTestDb(),
    storage: createTestStorage(),
  });

  const result = await service.createShowcase({
    name: "Demo Thing",
    assetText: "Hello demo",
  });

  assert.deepEqual(result, {
    message: "Demo endpoint exercised auth, validation, db, storage, logger",
    userId: "user-demo-1",
    request: {
      requestId: "req-demo-123",
      ip: "203.0.113.10",
      userAgent: "Demo Test Agent",
    },
    exampleThing: {
      id: "thing-1",
      name: "Demo Thing",
      ownerId: "user-demo-1",
    },
    asset: {
      path: "demo/user-demo-1/thing-1.txt",
      contentType: "text/plain",
      signedReadUrl: "https://storage.test/demo/user-demo-1/thing-1.txt",
    },
  });
});

function createTestDb(): AppDb {
  const exampleThings = {
    async create(input: {name: string; ownerId?: string}) {
      return {
        id: "thing-1",
        name: input.name,
        ownerId: input.ownerId,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      } satisfies ExampleThing;
    },
    async update(id: string, input: {ownerId?: string}) {
      return {
        id,
        name: "Demo Thing",
        ownerId: input.ownerId,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:01.000Z",
      } satisfies ExampleThing;
    },
  } as unknown as ExampleThingRepository;
  const db: AppDb = {
    exampleThings,
    runTransaction<T>(callback: (db: AppDb) => Promise<T>) {
      return callback(db);
    },
  };

  return db;
}

function createTestStorage(): AppStorage {
  const assets = {
    async upload(input: {path: string; contentType?: string}) {
      return {
        bucket: "test-bucket",
        path: input.path,
        contentType: input.contentType,
      } satisfies AssetMetadata;
    },
    async createSignedReadUrl(path: string) {
      return `https://storage.test/${path}`;
    },
  } as unknown as AssetStore;

  return {assets};
}
