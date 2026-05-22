# GCP Controller Boilerplate

This repo is a Firebase/GCP backend boilerplate with real npm workspace package boundaries.

## Structure

```txt
functions/
  packages/
    lib/
      backend-framework/
    services/
      health/
    functions/
      api/
```

- `packages/lib/*`: reusable infrastructure libraries.
- `packages/services/*`: shared business/service packages.
- `packages/functions/*`: deployable Firebase function packages.

The Firebase entrypoint is `@app/api-function`, exposed through:

```txt
functions/packages/functions/api/dist/index.js
```

The root `functions/package.json` points Firebase at that compiled entry.

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
- `functions/lib-tests/`
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
import {HealthService} from "@app/health-service";
```

These are real npm workspace packages, not TypeScript-only aliases.

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

## Tests

Tests can be colocated anywhere under `functions/packages` using:

```txt
*.test.ts
```

Production package builds exclude test files. The test build compiles them into `functions/lib-tests`.
