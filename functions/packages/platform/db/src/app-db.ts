import {getFirestore} from "firebase-admin/firestore";
import type {CollectionReference, Firestore} from "firebase-admin/firestore";

import {
  ExampleThingDocument,
  ExampleThingRepository,
} from "./example-things";

export type AppDb = {
  exampleThings: ExampleThingRepository;
};

export function createDb(firestore: Firestore = getFirestore()): AppDb {
  const exampleThingsCollection = firestore.collection("exampleThings") as
    CollectionReference<ExampleThingDocument>;

  return {
    exampleThings: new ExampleThingRepository(exampleThingsCollection),
  };
}
