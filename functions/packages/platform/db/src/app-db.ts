import {getFirestore} from "firebase-admin/firestore";
import type {CollectionReference, Firestore} from "firebase-admin/firestore";

import type {RepositoryOperationOptions} from "./base-repository";
import {
  ExampleThingDocument,
  ExampleThingRepository,
} from "./example-things";

export type AppDbRepositories = {
  exampleThings: ExampleThingRepository;
};

export type AppDb = AppDbRepositories & {
  runTransaction<T>(callback: (db: AppDb) => Promise<T>): Promise<T>;
};

export function createDb(
  firestore: Firestore = getFirestore(),
  options: RepositoryOperationOptions = {}
): AppDb {
  return {
    ...createRepositories(firestore, options),
    runTransaction(callback) {
      return firestore.runTransaction((transaction) => {
        return callback(createDb(firestore, {transaction}));
      });
    },
  };
}

function createRepositories(
  firestore: Firestore,
  options: RepositoryOperationOptions
): AppDbRepositories {
  const exampleThingsCollection = firestore.collection("exampleThings") as
    CollectionReference<ExampleThingDocument>;

  return {
    exampleThings: new ExampleThingRepository(exampleThingsCollection, options),
  };
}
