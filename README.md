# GCP Controller Boilerplate

This repo is a Firebase/GCP backend boilerplate with real npm workspace package boundaries.

## Structure

```txt
functions/
  packages/
    platform/
      backend-service/
      config/
      backend-framework/
      db/
      firebase-auth/
      logger/
      storage/
      testing/
      validation/
    services/
      health/
    functions/
      index/
      api/
```

- `packages/platform/*`: reusable infrastructure/platform packages.
- `packages/services/*`: shared business/service packages.
- `packages/functions/index`: the Firebase deployment entrypoint that re-exports deployable functions.
- `packages/functions/*`: deployable Firebase function packages.

The Firebase entrypoint is `@app/functions-index`, exposed through:

```txt
functions/packages/functions/index/dist/index.js
```

The root `functions/package.json` points Firebase at that compiled entry. Individual functions are exported from their own packages, then re-exported by `packages/functions/index`.

## Common Commands

Run commands from `functions/`:

```sh
npm run build
npm test
npm run lint
npm run clean
```

`npm run clean` removes generated build output only:

- `functions/lib/`
- `functions/packages/**/dist/`
- `*.tsbuildinfo`

## Emulator

From the repo root, run:

```sh
npm --prefix functions run serve
```

This runs the functions build first, then starts the Firebase Functions emulator.

The current HTTP function is named `api`. With the default emulator port from `firebase.json`, the URL is:

```txt
http://127.0.0.1:5001/<project-id>/us-central1/api/health
```

You can find `<project-id>` in `.firebaserc`, or in the emulator startup output.

Example:

```sh
curl http://127.0.0.1:5001/<project-id>/us-central1/api/health
```

Expected response shape:

```json
{
  "code": "OK",
  "message": "OK",
  "data": {
    "status": "ok",
    "service": "api",
    "requestId": "..."
  }
}
```

## Demo Endpoint

The API also includes an authenticated showcase endpoint:

```txt
POST /demo/showcase
```

It demonstrates route validation, Firebase auth claims, `BaseService`, logging, DB transactions, Storage uploads, signed URLs, and request metadata in one place.

Example payload:

```json
{
  "name": "Demo Thing",
  "assetText": "Hello from the demo endpoint"
}
```

This endpoint creates an example Firestore document and a text asset in Storage. Treat it as a template and remove or replace it when real business modules are added.

## Package Imports

Packages use real workspace imports:

```ts
import {Controller, Route} from "@app/backend-framework";
import {BaseService} from "@app/backend-service";
import {readAppConfig} from "@app/config";
import {createDb} from "@app/db";
import {createFirebaseAuthMiddleware} from "@app/firebase-auth";
import {Logger} from "@app/logger";
import {createStorage} from "@app/storage";
import {object, string} from "@app/validation";
import {HealthService} from "@app/health-service";
```

These are real npm workspace packages, not TypeScript-only aliases.

## Config And Secrets

Use `@app/config` for environment config:

```ts
const config = readAppConfig();
```

Supported env vars:

- `APP_STAGE`: `local`, `dev`, `staging`, or `prod`
- `STORAGE_BUCKET`: optional Firebase Storage bucket override
- `CORS_ALLOWED_ORIGINS`: comma-separated list of allowed browser origins

For local development, copy the example file:

```sh
cp functions/.env.example functions/.env.local
```

Firebase Functions supports `.env`, `.env.<project-or-alias>`, and `.env.local`. Keep real env files out of git; only commit examples. Use env files for non-secret config only.

Secrets use Firebase Functions v2 secret params, backed by Google Secret Manager:

```ts
// packages/functions/api/src/secrets.ts
import {defineAppSecret} from "@app/config";

export const stripeSecretKey = defineAppSecret("STRIPE_SECRET_KEY");

export const apiSecrets = [
  stripeSecretKey,
];
```

Bind secrets to each function through `onRequest({secrets: apiSecrets}, handler)`.

```ts
// packages/functions/api/src/index.ts
import {apiSecrets} from "./secrets";

export const api = onRequest({secrets: apiSecrets}, handler);
```

Read secret values from runtime code only:

```ts
import {readSecret} from "@app/config";
import {stripeSecretKey} from "./secrets";

const value = readSecret(stripeSecretKey);
```

Secret values are only available at runtime, so do not call `.value()` during module initialization.

Set secret values with the Firebase CLI:

```sh
firebase functions:secrets:set STRIPE_SECRET_KEY
```

## Environments

For real projects, use separate Firebase/GCP projects for `dev`, `staging`, and `prod`. That gives each environment isolated Auth users, Firestore data, Storage buckets, Secret Manager values, IAM, billing, and deploy history.

Use `.firebaserc` aliases to switch targets:

```sh
firebase use dev
firebase use staging
firebase use prod
```

Then set environment-specific config and secrets per project.

Use `.firebaserc.example` as a template for local project aliases:

```sh
cp .firebaserc.example .firebaserc
```

## Validation

Routes accept any object with a `.parse(value)` method as a schema. `@app/validation` provides a tiny built-in schema helper for simple boilerplate cases:

```ts
const CreateThingPayload = object({
  name: string(),
});
```

You can replace this with Zod later because the route contract only depends on `.parse(...)`.

## CORS

The API function uses `createCorsMiddleware` and reads allowed origins from `CORS_ALLOWED_ORIGINS`.

Example local value:

```txt
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
```

## Services

Services can extend `BaseService` from `@app/backend-service` to receive a typed request context and structured logger:

```ts
export class ExampleService extends BaseService {
  doThing() {
    this.logger.info("Doing thing");
    return {
      requestId: this.context.requestId,
    };
  }
}
```

`BaseService` also exposes the typed app database as `this.db`:

```ts
await this.db.exampleThings.create({
  name: "Example",
});
```

It also exposes app storage as `this.storage`:

```ts
await this.storage.assets.upload({
  path: `users/${userId}/avatar.png`,
  data: avatarBuffer,
  contentType: "image/png",
});
```

## Database

Use `@app/db` for typed repository access. Firestore is the current backing implementation, but services depend on the app-facing database surface:

```ts
const db = createDb();
const thing = await db.exampleThings.create({name: "First thing"});
```

Repositories can share CRUD behavior by extending `BaseRepository`, then add model-specific query methods when Firestore paths or indexes require it.

Use `runTransaction` when multiple repository operations should commit together:

```ts
const thing = await this.db.runTransaction(async (txDb) => {
  const created = await txDb.exampleThings.create({name: "Draft"});
  return txDb.exampleThings.update(created.id, {ownerId: userId});
});
```

Inside the callback, repositories are already bound to the transaction.

## Storage

Use `@app/storage` for Firebase Storage assets:

```ts
const storage = createStorage();

await storage.assets.upload({
  path: "stories/story-1/cover.png",
  data: coverBuffer,
  contentType: "image/png",
});

const url = await storage.assets.createSignedReadUrl(
  "stories/story-1/cover.png",
  {expiresAt: Date.now() + 15 * 60 * 1000}
);
```

Storage is intentionally separate from `@app/db` because assets have different lifecycle and access patterns than structured app records.

## Logging

Use `@app/logger` when a service or controller needs structured Firebase logs:

```ts
const logger = new Logger(context);

logger.info("Request handled", {elapsedMs: 12});
logger.exception("Request failed", error);
```

Log entries automatically include request context such as service name, stage, request id, method, and path.

## Firebase Auth

Use `@app/firebase-auth` to validate Firebase ID tokens from `Authorization: Bearer <token>` headers:

```ts
createHttpRouter({
  context,
  controllers,
  middlewares: [createFirebaseAuthMiddleware()],
});
```

Routes marked with `authenticated: true` require a bearer token and verified claims. The middleware stores the decoded Firebase token on `context.claims`, which is then passed to the controller route args.

## Adding A Service

Create a package under `functions/packages/services/<name>`:

```txt
functions/packages/services/example/
  package.json
  tsconfig.json
  src/
    index.ts
```

Then add it to `functions/packages/services/tsconfig.json` references.

If another package uses it, add the dependency to that package's `package.json` and add a TypeScript project reference in that package's `tsconfig.json`.

## Adding A Function Module

Controller modules live inside a deployable function package:

```txt
functions/packages/functions/api/src/modules/<module-name>/
  controllers/
    <module>-controller.ts
    index.ts
  index.ts
```

Controllers should return plain data:

```ts
return this.someService.doThing();
```

The backend framework wraps successful responses as:

```ts
success(data)
```

## Adding A Deployable Function

Create a package under `functions/packages/functions/<name>` and export one or more Firebase functions from its `src/index.ts`.

Then re-export those functions from:

```txt
functions/packages/functions/index/src/index.ts
```

Example:

```ts
export {api} from "@app/api-function";
export {adminApi} from "@app/admin-api-function";
```

Also add the new function package to `functions/packages/functions/tsconfig.json` references, and add it as a dependency of `@app/functions-index`.

## Tests

Tests can be colocated anywhere under `functions/packages` using:

```txt
*.test.ts
```

Production package builds exclude test files. Tests run directly from TypeScript with Jest and `ts-jest`, so no separate compiled test output is needed.

Use `@app/testing` for shared fake backend objects:

```ts
const request = createTestHttpRequest({url: "/health"});
const response = await invokeTestRouter(router, request);
const context = createTestRequestContext();
const claims = createTestFirebaseIdToken();
```
