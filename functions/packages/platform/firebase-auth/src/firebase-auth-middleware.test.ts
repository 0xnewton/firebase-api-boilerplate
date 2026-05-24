import assert from "node:assert/strict";
import {test} from "@jest/globals";
import type {DecodedIdToken} from "firebase-admin/auth";

import type {RequestContext} from "@app/backend-framework";
import {UnauthorizedError} from "@app/backend-framework";
import {
  createFirebaseAuthMiddleware,
  createFirebaseTokenAuthenticator,
} from "./firebase-auth-middleware";
import type {FirebaseIdTokenVerifier} from "./firebase-auth-middleware";

test("skips verification when no bearer token is present", async () => {
  const context = createContext();
  let calledNext = false;

  await createFirebaseAuthMiddleware({
    verifier: createVerifier(async () => {
      throw new Error("Should not verify");
    }),
  })(context, async () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(context.claims, undefined);
});

test("verifies bearer tokens and stores decoded claims", async () => {
  const context = createContext({
    authToken: "token-123",
  });
  const claims = createClaims({uid: "user-1"});
  let capturedToken = "";
  let capturedCheckRevoked: boolean | undefined;

  await createFirebaseAuthMiddleware({
    checkRevoked: true,
    verifier: createVerifier(async (token, checkRevoked) => {
      capturedToken = token;
      capturedCheckRevoked = checkRevoked;
      return claims;
    }),
  })(context, async () => undefined);

  assert.equal(capturedToken, "token-123");
  assert.equal(capturedCheckRevoked, true);
  assert.deepEqual(context.claims, claims);
});

test("throws unauthorized errors for invalid bearer tokens", async () => {
  const context = createContext({
    authToken: "bad-token",
  });

  await assert.rejects(
    () => createFirebaseAuthMiddleware({
      verifier: createVerifier(async () => {
        throw new Error("Invalid token");
      }),
    })(context, async () => undefined),
    (error: unknown) => {
      assert.equal(error instanceof UnauthorizedError, true);
      assert.equal(
        (error as UnauthorizedError).message,
        "Invalid Firebase ID token"
      );
      return true;
    }
  );
});

test("creates route authenticators for authenticated routes", async () => {
  const claims = createClaims({uid: "user-2"});
  const authenticator = createFirebaseTokenAuthenticator({
    verifier: createVerifier(async () => claims),
  });

  assert.deepEqual(
    await authenticator("token-456", createContext()),
    claims
  );
});

function createContext(
  overrides: Partial<RequestContext> = {}
): RequestContext {
  return {
    serviceName: "test-api",
    stage: "test",
    requestId: "req-123",
    request: {
      method: "GET",
      path: "/private",
      headers: {},
      query: {},
      params: {},
      body: undefined,
      cookies: {},
    },
    response: {
      statusCode: 200,
      headers: {},
    },
    ...overrides,
  };
}

function createVerifier(
  verify: FirebaseIdTokenVerifier["verifyIdToken"]
): FirebaseIdTokenVerifier {
  return {
    verifyIdToken: verify,
  };
}

function createClaims(
  overrides: Partial<DecodedIdToken> = {}
): DecodedIdToken {
  return {
    aud: "test-project",
    auth_time: 1,
    exp: 2,
    firebase: {
      identities: {},
      sign_in_provider: "password",
    },
    iat: 1,
    iss: "https://securetoken.google.com/test-project",
    sub: "user",
    uid: "user",
    ...overrides,
  };
}
