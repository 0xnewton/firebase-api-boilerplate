import {Controller, Route, success} from "../../../framework";

export class HealthController extends Controller {
  @Route({
    path: "/health",
    method: "GET",
  })
  async check() {
    return success({
      status: "ok",
      service: this.context.serviceName,
      requestId: this.context.requestId,
    });
  }
}
