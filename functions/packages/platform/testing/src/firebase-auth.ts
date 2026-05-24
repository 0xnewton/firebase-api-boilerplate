import {faker} from "@faker-js/faker";
import type {DecodedIdToken} from "firebase-admin/auth";

export function createTestFirebaseIdToken(
  overrides: Partial<DecodedIdToken> = {}
): DecodedIdToken {
  const projectId = faker.internet.domainWord();
  const uid = faker.string.uuid();
  const issuedAt = toSeconds(faker.date.recent());

  return {
    aud: projectId,
    auth_time: issuedAt,
    email: faker.internet.email(),
    email_verified: true,
    exp: toSeconds(faker.date.soon()),
    firebase: {
      identities: {},
      sign_in_provider: "password",
    },
    iat: issuedAt,
    iss: `https://securetoken.google.com/${projectId}`,
    sub: uid,
    uid,
    ...overrides,
  };
}

function toSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
