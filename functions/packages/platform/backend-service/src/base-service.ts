import type {RequestContext} from "@app/backend-framework";
import {Logger} from "@app/logger";

export class BaseService {
  protected readonly logger: Logger;

  constructor(protected readonly context: RequestContext) {
    this.logger = new Logger(context);
  }
}
