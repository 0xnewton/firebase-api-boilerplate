import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {UnauthorizedError} from "@app/backend-framework";
import {
  createTestFirebaseIdToken,
  createTestRequestContext,
} from "@app/testing";
import {createFirebaseAuthMiddleware} from "./firebase-auth-middleware";
import type {FirebaseIdTokenVerifier} from "./firebase-auth-middleware";

test("skips verification when no bearer token is present", async () => {
  const context = createTestRequestContext();
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
  const context = createTestRequestContext({
    authToken: "token-123",
  });
  const claims = createTestFirebaseIdToken({uid: "user-1"});
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
  const context = createTestRequestContext({
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

function createVerifier(
  verify: FirebaseIdTokenVerifier["verifyIdToken"]
): FirebaseIdTokenVerifier {
  return {
    verifyIdToken: verify,
  };
}
