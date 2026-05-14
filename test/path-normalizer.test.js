const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizePathSegment } = require("../src/rag/path-normalizer");

test("normalizePathSegment keeps Thai filenames when replacing invalid chars", () => {
  const filename = "ประกาศ-รายงานตัวขึ้นทะเบียนนักศึกษาใหม่-ป.pdf";

  const result = normalizePathSegment(filename, { replaceInvalid: true });

  assert.equal(result, filename);
});

test("normalizePathSegment replaces invalid punctuation but keeps Thai letters", () => {
  const filename = "ประกาศ:รายงาน?.pdf";

  const result = normalizePathSegment(filename, { replaceInvalid: true });

  assert.equal(result, "ประกาศ_รายงาน_.pdf");
});

test("normalizePathSegment normalizes to NFC", () => {
  const decomposed = "Cafe\u0301.txt";

  const result = normalizePathSegment(decomposed, { replaceInvalid: true });

  assert.equal(result, "Café.txt");
});
