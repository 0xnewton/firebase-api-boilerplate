import assert from "node:assert/strict";
import {test} from "@jest/globals";
import type {Storage} from "firebase-admin/storage";

import {AssetStore} from "./asset-store";
import {createStorageFromBucket} from "./app-storage";

type Bucket = ReturnType<Storage["bucket"]>;
type StorageFile = ReturnType<Bucket["file"]>;
type SaveData = Parameters<StorageFile["save"]>[0];
type SaveOptions = NonNullable<Parameters<StorageFile["save"]>[1]>;
type SignedUrlConfig = Parameters<StorageFile["getSignedUrl"]>[0];

type StoredFile = {
  data: SaveData;
  contentType?: string;
  customMetadata?: Record<string, string>;
};

type FakeBucket = {
  bucket: Bucket;
  files: Map<string, StoredFile>;
};

test("uploads assets under a base path and reads metadata", async () => {
  const {bucket, files} = createFakeBucket();
  const store = new AssetStore(bucket, "uploads");

  const metadata = await store.upload({
    path: "/avatars/user-1.png",
    data: Buffer.from("avatar"),
    contentType: "image/png",
    metadata: {
      ownerId: "user-1",
    },
  });

  assert.equal(files.has("uploads/avatars/user-1.png"), true);
  assert.equal(metadata.bucket, "test-bucket");
  assert.equal(metadata.path, "uploads/avatars/user-1.png");
  assert.equal(metadata.contentType, "image/png");
  assert.equal(metadata.size, "6");
});

test("checks existence, signs read URLs, and deletes assets", async () => {
  const {bucket} = createFakeBucket();
  const storage = createStorageFromBucket(bucket);

  await storage.assets.upload({
    path: "documents/report.txt",
    data: "hello",
    contentType: "text/plain",
  });

  assert.equal(await storage.assets.exists("documents/report.txt"), true);
  assert.equal(
    await storage.assets.createSignedReadUrl("documents/report.txt", {
      expiresAt: "2030-01-01",
    }),
    "https://storage.test/test-bucket/documents/report.txt?expires=2030-01-01"
  );

  await storage.assets.delete("documents/report.txt");
  assert.equal(await storage.assets.exists("documents/report.txt"), false);
});

function createFakeBucket(name = "test-bucket"): FakeBucket {
  const files = new Map<string, StoredFile>();

  const bucket = {
    name,
    file(path: string) {
      return {
        async save(data: SaveData, options?: SaveOptions) {
          files.set(path, {
            data,
            contentType: options?.metadata?.contentType,
            customMetadata: options?.metadata?.metadata,
          });
        },
        async exists() {
          return [files.has(path)];
        },
        async getMetadata() {
          const file = files.get(path);
          return [{
            bucket: name,
            name: path,
            contentType: file?.contentType,
            metadata: file?.customMetadata,
            size: getSize(file?.data),
            updated: "2026-05-24T00:00:00.000Z",
            md5Hash: "fake-md5",
          }];
        },
        async getSignedUrl(config: SignedUrlConfig) {
          return [
            `https://storage.test/${name}/${path}?expires=${config.expires}`,
          ];
        },
        async delete() {
          files.delete(path);
        },
      } as unknown as StorageFile;
    },
  } as unknown as Bucket;

  return {bucket, files};
}

function getSize(data: SaveData | undefined): string | undefined {
  if (data === undefined) {
    return undefined;
  }

  if (typeof data === "string") {
    return String(Buffer.byteLength(data));
  }

  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    return String(data.length);
  }

  return undefined;
}
