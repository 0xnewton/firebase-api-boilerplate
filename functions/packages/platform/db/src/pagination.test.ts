import assert from "node:assert/strict";
import {test} from "@jest/globals";

import {normalizePageLimit} from "./pagination";

test("normalizes page limits", () => {
  assert.equal(normalizePageLimit(undefined), 25);
  assert.equal(normalizePageLimit(0), 25);
  assert.equal(normalizePageLimit(10), 10);
  assert.equal(normalizePageLimit(500), 100);
});
