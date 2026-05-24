import type {RequestContext} from "@app/backend-framework";
import {createDb} from "@app/db";
import type {AppDb} from "@app/db";
import {Logger} from "@app/logger";
import {createStorage} from "@app/storage";
import type {AppStorage} from "@app/storage";

export type BaseServiceDependencies = {
  db?: AppDb;
  storage?: AppStorage;
};

export class BaseService {
  private dbInstance?: AppDb;
  private storageInstance?: AppStorage;
  protected readonly logger: Logger;

  constructor(
    protected readonly context: RequestContext,
    dependencies: BaseServiceDependencies = {}
  ) {
    this.dbInstance = dependencies.db;
    this.storageInstance = dependencies.storage;
    this.logger = new Logger(context);
  }

  protected get db(): AppDb {
    this.dbInstance ??= createDb();
    return this.dbInstance;
  }

  protected get storage(): AppStorage {
    this.storageInstance ??= createStorage();
    return this.storageInstance;
  }
}
