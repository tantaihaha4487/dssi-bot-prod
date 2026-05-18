const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdir, rm, writeFile } = require("node:fs/promises");
const path = require("node:path");

const { dataDir } = require("../src/rag/data-loader");
const {
  createAskSourceFileSelectRow,
  createAskSourceFileRequest,
  _test,
} = require("../src/utils/ask-source-file");
const {
  _test: askSourceFileButtonTest,
} = require("../src/events/interactionCreate/askSourceFileButton");

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
    ],
  };

  assert.equal(_test.parseSelectionNumber("2"), 2);
  assert.equal(_test.resolveAskSourceSelection(request, "2").relativePath, "nested/two.txt");
  assert.equal(_test.resolveAskSourceSelection(request, "nested/two.txt").relativePath, "nested/two.txt");
  assert.equal(_test.resolveAskSourceSelection(request, "unknown"), null);
});

test("createAskSourceFileSelectRow lists up to 25 options", async () => {
  const testDir = path.join(dataDir, "_test_ask_source_picker");
  await mkdir(testDir, { recursive: true });

  const sources = Array.from({ length: 26 }, (_, index) => {
    const relativePath = `_test_ask_source_picker/${index + 1}-very-long-file-name-${"x".repeat(90)}.txt`;
    return {
      label: relativePath,
      relativePath,
    };
  });

  try {
    await Promise.all(
      sources.map(({ relativePath }) => writeFile(path.join(dataDir, relativePath), "x")),
    );

    const request = await createAskSourceFileRequest(sources.map(({ relativePath }) => relativePath));

    assert.ok(request);

    const row = createAskSourceFileSelectRow(request);
    assert.ok(row);

    const options = row.toJSON().components[0].options;

    assert.equal(options.length, 25);
    assert.ok(options.every((option) => option.label.length <= 100));
    assert.equal(options[0].value, "1");
    assert.equal(options[24].value, "25");
  } finally {
    await rm(testDir, { recursive: true, force: true });
  }
});

test("source selection placeholder reflects the number of results", () => {
  assert.equal(_test.createSourceSelectionPlaceholder(1), "Pick 1-1 source");
  assert.equal(_test.createSourceSelectionPlaceholder(3), "Pick 1-3 sources");
  assert.equal(_test.createSourceSelectionPlaceholder(26), "Pick 1-25 of 26 sources");
});

test("getSourceReply reuses the same in-flight tmpfiles upload", async () => {
  const payload = { content: "https://tmpfiles.org/example" };
  const request = {
    cachedTmpfilesPayloads: new Map(),
    pendingTmpfilesPayloads: new Map(),
  };

  let callCount = 0;
  let resolveReply;
  const replyPromise = new Promise((resolve) => {
    resolveReply = resolve;
  });

  const loadReply = () => {
    callCount += 1;
    return replyPromise;
  };

  const first = askSourceFileButtonTest.getSourceReply(
    request,
    "nested/file.txt",
    123,
    loadReply,
  );
  const second = askSourceFileButtonTest.getSourceReply(
    request,
    "nested/file.txt",
    123,
    loadReply,
  );

  assert.equal(callCount, 1);
  assert.equal(request.pendingTmpfilesPayloads.size, 1);

  resolveReply({ payload, deliveryKind: "tmpfiles" });

  const [firstReply, secondReply] = await Promise.all([first, second]);

  assert.equal(firstReply.payload, payload);
  assert.equal(secondReply.payload, payload);
  assert.equal(request.pendingTmpfilesPayloads.size, 0);
  assert.equal(request.cachedTmpfilesPayloads.get("nested/file.txt"), payload);

  const cachedReply = await askSourceFileButtonTest.getSourceReply(
    request,
    "nested/file.txt",
    123,
    () => {
      throw new Error("should not reload cached tmpfiles payload");
    },
  );

  assert.equal(cachedReply.payload, payload);
});
