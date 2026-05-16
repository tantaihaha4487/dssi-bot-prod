const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdir, rm, writeFile } = require("node:fs/promises");
const path = require("node:path");

const { dataDir } = require("../src/rag/data-loader");
const {
  createAskSourceFileRequest,
  _test,
} = require("../src/utils/ask-source-file");
const { _test: handlerTest } = require("../src/events/interactionCreate/askSourceFileButton");

test("createAskSourceFileRequest resolves and deduplicates sources", async () => {
  const testDir = path.join(dataDir, "_test_ask_source_file");
  const filePath = path.join(testDir, "alpha.txt");

  await mkdir(testDir, { recursive: true });
  await writeFile(filePath, "alpha");

  try {
    const request = await createAskSourceFileRequest([
      "_test_ask_source_file/alpha.txt",
      "/_test_ask_source_file/alpha.txt",
      "_test_ask_source_file/missing.txt",
    ]);

    assert.ok(request);
    assert.deepEqual(request.sources, [
      {
        label: "_test_ask_source_file/alpha.txt",
        relativePath: "_test_ask_source_file/alpha.txt",
      },
    ]);
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
});

test("createAskSourceFileRequest returns null when no sources resolve", async () => {
  const request = await createAskSourceFileRequest([
    "_test_ask_source_file/missing.txt",
  ]);

  assert.equal(request, null);
});

test("source selection helpers resolve numbers and paths", () => {
  const request = {
    sources: [
      { label: "one.txt", relativePath: "one.txt" },
      { label: "nested/two.txt", relativePath: "nested/two.txt" },
      { label: "2024/report.pdf", relativePath: "2024/report.pdf" },
    ],
  };

  assert.equal(_test.parseSelectionNumber("2"), 2);
  assert.equal(_test.parseSelectionNumber("2. nested/two.txt"), null);
  assert.equal(_test.parsePickedSelection("pick: 2"), "2");
  assert.equal(_test.resolveAskSourceSelection(request, "pick: 2").relativePath, "nested/two.txt");
  assert.equal(
    _test.resolveAskSourceSelection(request, "pick: nested/two.txt").relativePath,
    "nested/two.txt",
  );
  assert.equal(
    _test.resolveAskSourceSelection(request, "pick: 2024/report.pdf").relativePath,
    "2024/report.pdf",
  );
  assert.equal(_test.resolveAskSourceSelection(request, "nested/two.txt"), null);
  assert.equal(_test.resolveAskSourceSelection(request, "unknown"), null);
});

test("createSourceSelectionPrompt lists source options", () => {
  const prompt = _test.createSourceSelectionPrompt([
    { label: "one.txt", relativePath: "one.txt" },
    { label: "nested/two.txt", relativePath: "nested/two.txt" },
  ]);

  assert.match(prompt, /1\. one\.txt/);
  assert.match(prompt, /2\. nested\/two\.txt/);
});

test("invalid selection message is capped below Discord content limits", () => {
  const request = {
    sources: Array.from({ length: 25 }, (_, index) => ({
      label: `${String(index + 1).padStart(2, "0")}/`.repeat(80) + `file-${index}.txt`,
      relativePath: `${index + 1}/file-${index}.txt`,
    })),
  };

  const message = handlerTest.createInvalidSelectionMessage(request);

  assert.ok(message.length < 2000);
  assert.match(message, /pick: 1/);
});
