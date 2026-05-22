import {Controller, RequestContext, Route} from "../../../framework";
import {HealthService} from "../services";

export class HealthController extends Controller {
  private healthService!: HealthService;

  async initialize(context: RequestContext) {
    await super.initialize(context);
    this.healthService = new HealthService(context);
  }

  @Route({
    path: "/health",
    method: "GET",
  })
  async check() {
    return this.healthService.getHealth();
  }
}
