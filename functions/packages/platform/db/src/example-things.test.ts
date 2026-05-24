import assert from "node:assert/strict";
import {test} from "@jest/globals";
import type {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Transaction,
  UpdateData,
  WithFieldValue,
} from "firebase-admin/firestore";

import {DocumentNotFoundError} from "./base-repository";
import {
  ExampleThingDocument,
  ExampleThingRepository,
} from "./example-things";

type FakeCollection = {
  collection: CollectionReference<ExampleThingDocument>;
  documents: Map<string, ExampleThingDocument>;
};

test("creates, reads, updates, and deletes example things", async () => {
  const {collection} = createFakeCollection();
  const repository = new ExampleThingRepository(collection);

  const created = await repository.create({
    name: "First thing",
    ownerId: "user-1",
  });

  assert.equal(created.id, "generated-1");
  assert.equal(created.name, "First thing");
  assert.equal(created.ownerId, "user-1");
  assert.equal(typeof created.createdAt, "string");
  assert.equal(typeof created.updatedAt, "string");

  const found = await repository.get(created.id);
  assert.deepEqual(found, created);

  const updated = await repository.update(created.id, {
    name: "Updated thing",
  });

  assert.equal(updated.id, created.id);
  assert.equal(updated.name, "Updated thing");
  assert.equal(updated.ownerId, "user-1");
  assert.notEqual(updated.updatedAt, "");

  await repository.delete(created.id);
  assert.equal(await repository.get(created.id), undefined);
});

test("throws when updating missing example things", async () => {
  const {collection} = createFakeCollection();
  const repository = new ExampleThingRepository(collection);

  await assert.rejects(
    () => repository.update("missing-id", {
      name: "Nope",
    }),
    DocumentNotFoundError
  );
});

test("supports example thing CRUD inside transactions", async () => {
  const {collection, documents} = createFakeCollection();
  const transaction = createFakeTransaction(documents);
  const repository = new ExampleThingRepository(collection);

  const created = await repository.create(
    {name: "Transactional thing"},
    {transaction}
  );

  assert.equal(created.id, "generated-1");
  assert.equal(documents.get(created.id)?.name, "Transactional thing");

  const found = await repository.get(created.id, {transaction});
  assert.deepEqual(found, created);

  const updated = await repository.update(
    created.id,
    {ownerId: "user-2"},
    {transaction}
  );

  assert.equal(updated.ownerId, "user-2");
  assert.equal(documents.get(created.id)?.ownerId, "user-2");

  await repository.delete(created.id, {transaction});
  assert.equal(documents.has(created.id), false);
});

function createFakeCollection(): FakeCollection {
  const documents = new Map<string, ExampleThingDocument>();
  let generatedCount = 0;

  const collection = {
    path: "exampleThings",
    doc(id?: string): DocumentReference<ExampleThingDocument> {
      const documentId = id ?? `generated-${++generatedCount}`;

      return {
        id: documentId,
        async set(data: WithFieldValue<ExampleThingDocument>) {
          documents.set(documentId, data as ExampleThingDocument);
        },
        async get() {
          return createSnapshot(documentId, documents.get(documentId));
        },
        async update(data: UpdateData<ExampleThingDocument>) {
          const existing = documents.get(documentId);
          if (!existing) {
            throw new DocumentNotFoundError("exampleThings", documentId);
          }

          documents.set(documentId, {
            ...existing,
            ...(data as Partial<ExampleThingDocument>),
          });
        },
        async delete() {
          documents.delete(documentId);
        },
      } as unknown as DocumentReference<ExampleThingDocument>;
    },
  } as unknown as CollectionReference<ExampleThingDocument>;

  return {collection, documents};
}

function createFakeTransaction(
  documents: Map<string, ExampleThingDocument>
): Transaction {
  const transaction = {
    async get(document: DocumentReference<ExampleThingDocument>) {
      return createSnapshot(document.id, documents.get(document.id));
    },
    set(
      document: DocumentReference<ExampleThingDocument>,
      data: WithFieldValue<ExampleThingDocument>
    ) {
      documents.set(document.id, data as ExampleThingDocument);
      return transaction;
    },
    update(
      document: DocumentReference<ExampleThingDocument>,
      data: UpdateData<ExampleThingDocument>
    ) {
      const existing = documents.get(document.id);
      if (!existing) {
        throw new DocumentNotFoundError("exampleThings", document.id);
      }

      documents.set(document.id, {
        ...existing,
        ...(data as Partial<ExampleThingDocument>),
      });
      return transaction;
    },
    delete(document: DocumentReference<ExampleThingDocument>) {
      documents.delete(document.id);
      return transaction;
    },
  };

  return transaction as unknown as Transaction;
}

function createSnapshot(
  id: string,
  data: ExampleThingDocument | undefined
): DocumentSnapshot<ExampleThingDocument> {
  return {
    id,
    exists: Boolean(data),
    data: () => data,
  } as DocumentSnapshot<ExampleThingDocument>;
}
