import type {RequestContext} from "../../../framework";

export class HealthService {
  constructor(private readonly context: RequestContext) {}

  getHealth() {
    return {
      status: "ok",
      service: this.context.serviceName,
      requestId: this.context.requestId,
    };
  }
}
