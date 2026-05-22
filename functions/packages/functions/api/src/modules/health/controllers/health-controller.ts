import {Controller, RequestContext, Route} from "@app/backend-framework";
import {HealthService} from "@app/health-service";

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
