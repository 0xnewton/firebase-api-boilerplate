import assert from "node:assert/strict";
import {test} from "@jest/globals";
import type {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Transaction,
  UpdateData,
  WithFieldValue,
} from "firebase-admin/firestore";

import {DocumentNotFoundError} from "./base-repository";
import {createDb} from "./app-db";
import {ExampleThingDocument} from "./example-things";

test("runs repository operations through a transaction-bound db", async () => {
  const firestore = createFakeFirestore();
  const db = createDb(firestore.firestore);

  const result = await db.runTransaction(async (txDb) => {
    const created = await txDb.exampleThings.create({
      name: "Created in transaction",
    });
    return txDb.exampleThings.update(created.id, {
      ownerId: "user-transaction",
    });
  });

  assert.equal(result.name, "Created in transaction");
  assert.equal(result.ownerId, "user-transaction");
  assert.equal(firestore.transactionWrites, 2);
  assert.equal(
    firestore.documents.get(result.id)?.ownerId,
    "user-transaction"
  );
});

type FakeFirestore = {
  firestore: Firestore;
  documents: Map<string, ExampleThingDocument>;
  transactionWrites: number;
};

function createFakeFirestore(): FakeFirestore {
  const documents = new Map<string, ExampleThingDocument>();
  let generatedCount = 0;
  let transactionWrites = 0;

  const createDocument = (
    documentId: string
  ): DocumentReference<ExampleThingDocument> => {
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
  };

  const collection = {
    path: "exampleThings",
    doc(id?: string) {
      return createDocument(id ?? `generated-${++generatedCount}`);
    },
  } as unknown as CollectionReference<ExampleThingDocument>;

  const transaction = {
    async get(document: DocumentReference<ExampleThingDocument>) {
      return createSnapshot(document.id, documents.get(document.id));
    },
    set(
      document: DocumentReference<ExampleThingDocument>,
      data: WithFieldValue<ExampleThingDocument>
    ) {
      transactionWrites++;
      documents.set(document.id, data as ExampleThingDocument);
      return transaction;
    },
    update(
      document: DocumentReference<ExampleThingDocument>,
      data: UpdateData<ExampleThingDocument>
    ) {
      transactionWrites++;
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
      transactionWrites++;
      documents.delete(document.id);
      return transaction;
    },
  };

  const firestore = {
    collection() {
      return collection;
    },
    async runTransaction<T>(
      callback: (transaction: Transaction) => Promise<T>
    ) {
      return callback(transaction as unknown as Transaction);
    },
  } as unknown as Firestore;

  return {
    firestore,
    documents,
    get transactionWrites() {
      return transactionWrites;
    },
  };
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
