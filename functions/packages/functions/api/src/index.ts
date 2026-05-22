import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";

import {createHttpRouter} from "@app/backend-framework";
import {HealthController} from "./modules/health";

setGlobalOptions({maxInstances: 10});

export const api = onRequest(
  createHttpRouter({
    context: {
      serviceName: "api",
      stage: process.env.GCLOUD_PROJECT ?? "local",
    },
    controllers: [HealthController],
  })
);
