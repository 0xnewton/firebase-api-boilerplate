import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {readAppConfig} from "./app-config";

test("reads app config from environment values", () => {
  const config = readAppConfig({
    APP_STAGE: "staging",
    GCLOUD_PROJECT: "project-staging",
    STORAGE_BUCKET: "project-staging.appspot.com",
    CORS_ALLOWED_ORIGINS: "https://app.test, https://admin.test",
    FUNCTION_MIN_INSTANCES: "1",
    FUNCTION_MAX_INSTANCES: "20",
  });

  assert.deepEqual(config, {
    stage: "staging",
    projectId: "project-staging",
    storageBucket: "project-staging.appspot.com",
    corsAllowedOrigins: ["https://app.test", "https://admin.test"],
    functions: {
      minInstances: 1,
      maxInstances: 20,
    },
  });
});

test("falls back to local app config defaults", () => {
  const config = readAppConfig({});

  assert.deepEqual(config, {
    stage: "local",
    projectId: "local",
    storageBucket: undefined,
    corsAllowedOrigins: [],
    functions: {
      minInstances: 0,
      maxInstances: 10,
    },
  });
});

test("rejects invalid function scaling values", () => {
  assert.throws(
    () => readAppConfig({
      FUNCTION_MIN_INSTANCES: "-1",
    }),
    /Expected a non-negative integer/
  );
});
