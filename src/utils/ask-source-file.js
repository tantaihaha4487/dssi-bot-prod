const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const crypto = require("node:crypto");
const { getDataFileTarget } = require("./data-file-delivery");

const ASK_SOURCE_FILE_BUTTON_PREFIX = "askSourceFile";
const ASK_SOURCE_FILE_MODAL_PREFIX = "askSourceFileModal";
const SOURCE_FILE_TTL_MS = 30 * 60 * 1000;
const MAX_SOURCE_PREVIEW_LENGTH = 3600;
const sourceFiles = new Map();

async function createAskSourceFileRequest(sources) {
  const resolvedSources = await findSourceFiles(sources);
  if (!resolvedSources.length) return null;

  const id = crypto.randomUUID();
  const request = {
    id,
    sources: resolvedSources,
    createdAt: Date.now(),
    cachedTmpfilesPayloads: new Map(),
  };

  sourceFiles.set(id, request);
  pruneExpiredSourceFiles();

  return request;
}

function getAskSourceFileRequest(id) {
  pruneExpiredSourceFiles();

  return sourceFiles.get(id) ?? null;
}

function createAskSourceFileButtonRow(sourceFileId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(createAskSourceFileButtonId(sourceFileId))
      .setLabel("Choose source file")
      .setStyle(ButtonStyle.Secondary),
  );
}

function createAskSourceFileModal(requestId) {
  const request = getAskSourceFileRequest(requestId);

  if (!request) return null;

  return new ModalBuilder()
    .setCustomId(createAskSourceFileModalId(requestId))
    .setTitle("Choose source file")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("sourceSelection")
          .setLabel("Type `pick: 1` or `pick: path/to/file`")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(createSourceSelectionPrompt(request.sources)),
      ),
    );
}

function parseAskSourceFileButtonId(customId) {
  if (!customId.startsWith(`${ASK_SOURCE_FILE_BUTTON_PREFIX}:`)) {
    return null;
  }

  return customId.slice(ASK_SOURCE_FILE_BUTTON_PREFIX.length + 1);
}

function parseAskSourceFileModalId(customId) {
  if (!customId.startsWith(`${ASK_SOURCE_FILE_MODAL_PREFIX}:`)) {
    return null;
  }

  return customId.slice(ASK_SOURCE_FILE_MODAL_PREFIX.length + 1);
}

async function findSourceFiles(sources) {
  const resolvedSources = [];
  const seenRelativePaths = new Set();

  for (const source of sources) {
    try {
      const target = await getDataFileTarget(source);

      if (seenRelativePaths.has(target.relativePath)) continue;

      seenRelativePaths.add(target.relativePath);
      resolvedSources.push({
        label: source,
        relativePath: target.relativePath,
      });
    } catch {
      // Stale or normalized metadata that no longer points to a file
    }
  }

  return resolvedSources;
}

function createAskSourceFileButtonId(sourceFileId) {
  return `${ASK_SOURCE_FILE_BUTTON_PREFIX}:${sourceFileId}`;
}

function createAskSourceFileModalId(sourceFileId) {
  return `${ASK_SOURCE_FILE_MODAL_PREFIX}:${sourceFileId}`;
}

function createSourceSelectionPrompt(sources) {
  const lines = [
    "Keep this list, then replace the last line with `pick: 1` or `pick: path/to/file`:",
    "",
  ];

  sources.forEach((source, index) => {
    lines.push(`${index + 1}. ${source.label}`);
  });

  const prompt = lines.join("\n");

  if (prompt.length <= MAX_SOURCE_PREVIEW_LENGTH) {
    return prompt;
  }

  const truncated = [];
  let length = 0;

  for (const line of lines) {
    const nextLength = length + line.length + (truncated.length ? 1 : 0);
    if (nextLength > MAX_SOURCE_PREVIEW_LENGTH) break;

    truncated.push(line);
    length = nextLength;
  }

  const omitted = sources.length - Math.max(0, truncated.length - 2);
  if (omitted > 0) {
    truncated.push(`...and ${omitted} more`);
  }

  return truncated.join("\n");
}

function resolveAskSourceSelection(request, selection) {
  const trimmed = selection.trim();
  if (!trimmed) return null;

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? "";
  const pickedSelection = parsePickedSelection(lastLine);

  if (!pickedSelection) return null;

  const exactMatch = request.sources.find(
    (source) => source.relativePath === pickedSelection || source.label === pickedSelection,
  );

  if (exactMatch) return exactMatch;

  const numericSelection = parseSelectionNumber(pickedSelection);

  if (numericSelection !== null) {
    return request.sources[numericSelection - 1] ?? null;
  }

  return null;
}

function parseSelectionNumber(value) {
  const match = value.match(/^(\d+)$/);
  if (!match) return null;

  const selection = Number(match[1]);
  return Number.isInteger(selection) && selection > 0 ? selection : null;
}

function parsePickedSelection(value) {
  const match = value.match(/^pick:\s*(.+)$/i);
  return match ? match[1].trim() : null;
}

function pruneExpiredSourceFiles() {
  const expiresBefore = Date.now() - SOURCE_FILE_TTL_MS;

  for (const [id, request] of sourceFiles) {
    if (request.createdAt < expiresBefore) {
      sourceFiles.delete(id);
    }
  }
}

module.exports = {
  createAskSourceFileButtonRow,
  createAskSourceFileModal,
  createAskSourceFileRequest,
  getAskSourceFileRequest,
  parseAskSourceFileButtonId,
  parseAskSourceFileModalId,
  resolveAskSourceSelection,
  _test: {
    createAskSourceFileModalId,
    createSourceSelectionPrompt,
    findSourceFiles,
    parseSelectionNumber,
    parsePickedSelection,
    resolveAskSourceSelection,
  },
};
