import type {
  CollectionReference,
  UpdateData,
} from "firebase-admin/firestore";

import {BaseRepository} from "./base-repository";

export type ExampleThing = {
  id: string;
  name: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExampleThingDocument = Omit<ExampleThing, "id">;

export type CreateExampleThingInput = {
  name: string;
  ownerId?: string;
};

export type UpdateExampleThingInput = {
  name?: string;
  ownerId?: string;
};

export class ExampleThingRepository extends BaseRepository<
  ExampleThingDocument,
  ExampleThing,
  CreateExampleThingInput,
  UpdateExampleThingInput
> {
  constructor(collection: CollectionReference<ExampleThingDocument>) {
    super(collection);
  }

  protected toCreateData(
    input: CreateExampleThingInput
  ): ExampleThingDocument {
    const now = new Date().toISOString();
    return {
      ...input,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected toUpdateData(
    input: UpdateExampleThingInput
  ): UpdateData<ExampleThingDocument> {
    return {
      ...input,
      updatedAt: new Date().toISOString(),
    };
  }

  protected toRead(id: string, data: ExampleThingDocument): ExampleThing {
    return {
      id,
      ...data,
    };
  }
}
