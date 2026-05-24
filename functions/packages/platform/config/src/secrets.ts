import {defineSecret} from "firebase-functions/params";
import type {SecretParam} from "firebase-functions/params";

export type AppSecret = SecretParam;

export function defineAppSecret(name: string): AppSecret {
  return defineSecret(name);
}

export function readSecret(secret: AppSecret): string {
  return secret.value();
}
