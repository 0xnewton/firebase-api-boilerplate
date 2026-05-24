import {Controller, Route} from "@app/backend-framework";
import {HealthService} from "@app/health-service";

export class HealthController extends Controller {
  private healthService?: HealthService;

  @Route({
    path: "/health",
    method: "GET",
  })
  async check() {
    return this.service.getHealth();
  }

  private get service(): HealthService {
    this.healthService ??= new HealthService(this.context);
    return this.healthService;
  }
}
