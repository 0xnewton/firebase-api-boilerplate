import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {object, optional, ParseError, string} from "./schema";

test("parses typed objects", () => {
  const schema = object({
    name: string(),
    ownerId: optional(string()),
  });

  assert.deepEqual(schema.parse({name: "Thing"}), {
    name: "Thing",
    ownerId: undefined,
  });
});

test("reports nested validation issues", () => {
  const schema = object({
    name: string(),
  });

  assert.throws(
    () => schema.parse({name: ""}),
    (error) => {
      assert.equal(error instanceof ParseError, true);
      assert.deepEqual((error as ParseError).issues, [{
        path: "name",
        message: "Expected a non-empty string",
      }]);
      return true;
    }
  );
});
