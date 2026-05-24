import {BaseService} from "@app/backend-service";

export class HealthService extends BaseService {
  getHealth() {
    this.logger.info("Health ping hit");
    
    return {
      status: "ok",
      service: this.context.serviceName,
      requestId: this.context.requestId,
    };
  }
}
