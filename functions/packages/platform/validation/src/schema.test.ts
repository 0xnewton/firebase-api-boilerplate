import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {nonEmptyString, z, ZodError} from "./schema";

test("parses typed objects", () => {
  const schema = z.object({
    name: nonEmptyString(),
    ownerId: z.string().optional(),
  });

  assert.deepEqual(schema.parse({name: "Thing"}), {
    name: "Thing",
  });
});

test("reports nested validation issues", () => {
  const schema = z.object({
    name: nonEmptyString(),
  });

  assert.throws(
    () => schema.parse({name: ""}),
    (error) => {
      assert.equal(error instanceof ZodError, true);
      assert.deepEqual((error as ZodError).issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })), [{
        path: "name",
        message: "Expected a non-empty string",
      }]);
      return true;
    }
  );
});
