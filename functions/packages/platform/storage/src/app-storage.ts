import {getStorage} from "firebase-admin/storage";
import type {Storage} from "firebase-admin/storage";

import {AssetStore} from "./asset-store";

type Bucket = ReturnType<Storage["bucket"]>;

export type AppStorage = {
  assets: AssetStore;
};

export type CreateStorageOptions = {
  bucketName?: string;
  assetsBasePath?: string;
};

export function createStorage(
  options: CreateStorageOptions = {},
  storage: Storage = getStorage()
): AppStorage {
  const bucket = storage.bucket(options.bucketName);
  return createStorageFromBucket(bucket, options);
}

export function createStorageFromBucket(
  bucket: Bucket,
  options: Pick<CreateStorageOptions, "assetsBasePath"> = {}
): AppStorage {
  return {
    assets: new AssetStore(bucket, options.assetsBasePath),
  };
}
