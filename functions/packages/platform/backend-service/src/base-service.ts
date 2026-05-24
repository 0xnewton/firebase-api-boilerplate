import type {RequestContext} from "@app/backend-framework";
import {createDb} from "@app/db";
import type {AppDb} from "@app/db";
import {Logger} from "@app/logger";

export class BaseService {
  private dbInstance?: AppDb;
  protected readonly logger: Logger;

  constructor(
    protected readonly context: RequestContext,
    db?: AppDb
  ) {
    this.dbInstance = db;
    this.logger = new Logger(context);
  }

  protected get db(): AppDb {
    this.dbInstance ??= createDb();
    return this.dbInstance;
  }
}
