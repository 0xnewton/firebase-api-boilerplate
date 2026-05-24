import {getApps, initializeApp} from "firebase-admin/app";
import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";

import {createCorsMiddleware, createHttpRouter} from "@app/backend-framework";
import {readAppConfig} from "@app/config";
import {createFirebaseAuthMiddleware} from "@app/firebase-auth";
import {HealthController} from "./modules/health";
import {apiSecrets} from "./secrets";

if (!getApps().length) {
  initializeApp();
}
setGlobalOptions({maxInstances: 10});

const config = readAppConfig(process.env);

export const api = onRequest(
  {
    invoker: "public",
    secrets: apiSecrets,
  },
  createHttpRouter({
    context: {
      serviceName: "api",
      stage: config.stage,
    },
    controllers: [HealthController],
    middlewares: [
      createCorsMiddleware({
        allowedOrigins: config.corsAllowedOrigins,
      }),
      createFirebaseAuthMiddleware(),
    ],
  })
);
