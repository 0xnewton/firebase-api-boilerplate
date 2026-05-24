import {getAuth} from "firebase-admin/auth";
import type {DecodedIdToken} from "firebase-admin/auth";

import type {
  Authenticator,
  Middleware,
  RequestContext,
} from "@app/backend-framework";
import {UnauthorizedError} from "@app/backend-framework";

export type FirebaseIdTokenVerifier = {
  verifyIdToken(
    idToken: string,
    checkRevoked?: boolean
  ): Promise<DecodedIdToken>;
};

export type FirebaseAuthOptions = {
  checkRevoked?: boolean;
  verifier?: FirebaseIdTokenVerifier;
};

export function createFirebaseAuthMiddleware(
  options: FirebaseAuthOptions = {}
): Middleware {
  return async (context, next) => {
    if (context.authToken) {
      context.claims = await verifyFirebaseIdToken(
        context.authToken,
        context,
        options
      );
    }

    await next();
  };
}

export function createFirebaseTokenAuthenticator(
  options: FirebaseAuthOptions = {}
): Authenticator {
  return (token, context) => verifyFirebaseIdToken(token, context, options);
}

export async function verifyFirebaseIdToken(
  token: string,
  _context: RequestContext,
  options: FirebaseAuthOptions = {}
): Promise<DecodedIdToken> {
  try {
    const verifier = options.verifier ?? getAuth();
    return await verifier.verifyIdToken(token, options.checkRevoked);
  } catch {
    throw new UnauthorizedError("Invalid Firebase ID token");
  }
}
