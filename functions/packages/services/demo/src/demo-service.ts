import {BaseService} from "@app/backend-service";

export type CreateDemoShowcaseInput = {
  name: string;
  assetText?: string;
};

export type DemoShowcaseResult = {
  message: string;
  userId: string;
  request: {
    requestId: string;
    ip?: string;
    userAgent?: string;
  };
  exampleThing: {
    id: string;
    name: string;
    ownerId?: string;
  };
  asset: {
    path: string;
    contentType?: string;
    signedReadUrl: string;
  };
};

export class DemoService extends BaseService {
  async createShowcase(
    input: CreateDemoShowcaseInput
  ): Promise<DemoShowcaseResult> {
    const userId = this.requireUserId();

    this.logger.info("Creating demo showcase", {
      userId,
      name: input.name,
    });

    const exampleThing = await this.db.runTransaction(async (txDb) => {
      const created = await txDb.exampleThings.create({
        name: input.name,
        ownerId: userId,
      });

      return txDb.exampleThings.update(created.id, {
        ownerId: userId,
      });
    });
    const assetPath = `demo/${userId}/${exampleThing.id}.txt`;

    const assetMetadata = await this.storage.assets.upload({
      path: assetPath,
      data: input.assetText ?? `Demo asset for ${input.name}`,
      contentType: "text/plain",
      metadata: {
        userId,
        exampleThingId: exampleThing.id,
      },
    });
    const signedReadUrl = await this.storage.assets.createSignedReadUrl(
      assetPath,
      {
        expiresAt: Date.now() + 15 * 60 * 1000,
      }
    );

    return {
      message: "Demo endpoint exercised auth, validation, db, storage, logger",
      userId,
      request: {
        requestId: this.context.requestId,
        ip: this.context.request.ip,
        userAgent: this.context.request.userAgent,
      },
      exampleThing: {
        id: exampleThing.id,
        name: exampleThing.name,
        ownerId: exampleThing.ownerId,
      },
      asset: {
        path: assetMetadata.path,
        contentType: assetMetadata.contentType,
        signedReadUrl,
      },
    };
  }
}
