# Agent Guide

This repo is a Firebase/GCP TypeScript backend boilerplate. Keep changes generic, reusable, and suitable for cloning into a product repo.

## Working Directory

Most commands should run from:

```sh
functions/
```

Use:

```sh
npm test
npm run build
npm run lint
npx tsc -p tsconfig.test.json --noEmit
```

## Architecture

The repo uses real npm workspace packages under `functions/packages`.

- `packages/functions/index`: Firebase deployment entrypoint.
- `packages/functions/api`: deployable API function.
- `packages/functions/*/src/modules/*`: controller modules for a function.
- `packages/services/*`: shared business services.
- `packages/platform/backend-framework`: controller, routes, router, middleware, HTTP errors, CORS.
- `packages/platform/backend-service`: `BaseService` with context, logger, db, storage, and auth helpers.
- `packages/platform/db`: app-facing database repositories and transaction helper.
- `packages/platform/storage`: app-facing asset storage helpers.
- `packages/platform/config`: env config and Firebase secret helpers.
- `packages/platform/firebase-auth`: Firebase ID token middleware.
- `packages/platform/logger`: Firebase logger wrapper.
- `packages/platform/testing`: shared test helpers.
- `packages/platform/validation`: minimal `.parse(...)` schema helpers.

## Design Rules

- Prefer platform packages for reusable infrastructure.
- Prefer service packages for business logic.
- Keep controllers thin: initialize services, read route args, return plain data.
- Do not wrap successful controller results manually; the router wraps them.
- Avoid `any`. Use `unknown`, generics, type guards, or narrow app-facing types.
- Keep Firebase SDK details inside platform packages when practical.
- Keep deployable function packages small and focused on wiring.
- Keep tests colocated as `*.test.ts`.
- Production package builds must exclude tests.

## Services

Services should extend `BaseService`.

Available helpers:

```ts
this.context
this.logger
this.db
this.storage
this.getUserId()
this.requireUserId()
```

Use transactions through the app DB surface:

```ts
await this.db.runTransaction(async (txDb) => {
  const created = await txDb.exampleThings.create({name: "Draft"});
  return txDb.exampleThings.update(created.id, {ownerId: userId});
});
```

## Secrets

Declare secrets at module scope in the function package that needs them:

```ts
// packages/functions/api/src/secrets.ts
import {defineAppSecret} from "@app/config";

export const stripeSecretKey = defineAppSecret("STRIPE_SECRET_KEY");

export const apiSecrets = [
  stripeSecretKey,
];
```

Bind them in `onRequest`:

```ts
onRequest({secrets: apiSecrets}, handler);
```

Only read secret values at runtime:

```ts
readSecret(stripeSecretKey);
```

## Environments

Use separate Firebase/GCP projects for `dev`, `staging`, and `prod`. Use `.firebaserc.example` as the template for local aliases.

## Build Output

There is no top-level `build/` folder. Each package emits to its own `dist/` folder. Firebase deploys from:

```txt
functions/packages/functions/index/dist/index.js
```

## Before Finishing

Run the full verification suite when changing code:

```sh
npm test
npm run build
npm run lint
npx tsc -p tsconfig.test.json --noEmit
```
