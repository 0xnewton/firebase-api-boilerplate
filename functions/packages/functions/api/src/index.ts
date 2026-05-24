import {getApps, initializeApp} from "firebase-admin/app";
import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";

import {createHttpRouter} from "@app/backend-framework";
import {createFirebaseAuthMiddleware} from "@app/firebase-auth";
import {HealthController} from "./modules/health";

if (!getApps().length) {
  initializeApp();
}
setGlobalOptions({maxInstances: 10});

export const api = onRequest(
  {invoker: "public"},
  createHttpRouter({
    context: {
      serviceName: "api",
      stage: process.env.GCLOUD_PROJECT ?? "local",
    },
    controllers: [HealthController],
    middlewares: [createFirebaseAuthMiddleware()],
  })
);
