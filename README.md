# GCP Controller Boilerplate

This repo is a Firebase/GCP backend boilerplate with real npm workspace package boundaries.

## Structure

```txt
functions/
  packages/
    platform/
      backend-service/
      backend-framework/
      firebase-auth/
      logger/
      testing/
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

## Package Imports

Packages use real workspace imports:

```ts
import {Controller, Route} from "@app/backend-framework";
import {BaseService} from "@app/backend-service";
import {createFirebaseAuthMiddleware} from "@app/firebase-auth";
import {Logger} from "@app/logger";
import {HealthService} from "@app/health-service";
```

These are real npm workspace packages, not TypeScript-only aliases.

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
