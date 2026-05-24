import type {
  CollectionReference,
  DocumentSnapshot,
  Transaction,
  UpdateData,
} from "firebase-admin/firestore";

export type Entity = {
  id: string;
};

export type RepositoryOperationOptions = {
  transaction?: Transaction;
};

export type CrudRepository<
  TRead extends Entity,
  TCreate extends object,
  TUpdate extends object
> = {
  create(input: TCreate, options?: RepositoryOperationOptions): Promise<TRead>;
  get(id: string, options?: RepositoryOperationOptions): Promise<
    TRead | undefined
  >;
  update(
    id: string,
    input: TUpdate,
    options?: RepositoryOperationOptions
  ): Promise<TRead>;
  delete(id: string, options?: RepositoryOperationOptions): Promise<void>;
};

export class DocumentNotFoundError extends Error {
  constructor(collectionPath: string, id: string) {
    super(`Document not found at ${collectionPath}/${id}`);
  }
}

export abstract class BaseRepository<
  TStored extends object,
  TRead extends Entity,
  TCreate extends object,
  TUpdate extends object
> implements CrudRepository<TRead, TCreate, TUpdate> {
  constructor(
    protected readonly collection: CollectionReference<TStored>
  ) {}

  async create(
    input: TCreate,
    options?: RepositoryOperationOptions
  ): Promise<TRead> {
    const document = this.collection.doc();
    const data = this.toCreateData(input);

    if (options?.transaction) {
      options.transaction.set(document, data);
    } else {
      await document.set(data);
    }

    return this.toRead(document.id, data);
  }

  async get(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<TRead | undefined> {
    const snapshot = await this.getSnapshot(id, options);
    if (!snapshot.exists) {
      return undefined;
    }

    return this.fromSnapshot(snapshot);
  }

  async update(
    id: string,
    input: TUpdate,
    options?: RepositoryOperationOptions
  ): Promise<TRead> {
    const document = this.collection.doc(id);
    const data = this.toUpdateData(input);

    if (options?.transaction) {
      const existing = await this.getRequired(id, options);
      options.transaction.update(document, data);
      return this.toRead(id, {
        ...this.toStoredData(existing),
        ...(data as Partial<TStored>),
      });
    }

    await document.update(data);
    return this.getRequired(document.id);
  }

  async delete(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<void> {
    const document = this.collection.doc(id);

    if (options?.transaction) {
      options.transaction.delete(document);
      return;
    }

    await document.delete();
  }

  protected abstract toCreateData(input: TCreate): TStored;

  protected abstract toUpdateData(input: TUpdate): UpdateData<TStored>;

  protected abstract toRead(id: string, data: TStored): TRead;

  protected toStoredData(entity: TRead): TStored {
    const data: Partial<TRead> = {...entity};
    delete data.id;
    return data as unknown as TStored;
  }

  protected async getRequired(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<TRead> {
    const snapshot = await this.getSnapshot(id, options);
    if (!snapshot.exists) {
      throw new DocumentNotFoundError(this.collection.path, id);
    }

    return this.fromSnapshot(snapshot);
  }

  private fromSnapshot(snapshot: DocumentSnapshot<TStored>): TRead {
    const data = snapshot.data();
    if (!data) {
      throw new DocumentNotFoundError(this.collection.path, snapshot.id);
    }

    return this.toRead(snapshot.id, data);
  }

  private getSnapshot(
    id: string,
    options?: RepositoryOperationOptions
  ): Promise<DocumentSnapshot<TStored>> {
    const document = this.collection.doc(id);
    if (options?.transaction) {
      return options.transaction.get(document);
    }

    return document.get();
  }
}
