import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdmin } from "../lib/rules";

test("isAdmin: awad@apixis.dev is the owner, case-insensitive", () => {
  assert.equal(isAdmin("awad@apixis.dev"), true);
  assert.equal(isAdmin("Awad@Apixis.dev "), true);
});

test("isAdmin: anyone else is not admin", () => {
  assert.equal(isAdmin("someone@gmail.com"), false);
  assert.equal(isAdmin(null), false);
  assert.equal(isAdmin(undefined), false);
});
