const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const crypto = require("node:crypto");
const { getDataFileTarget } = require("./data-file-delivery");

const ASK_SOURCE_FILE_BUTTON_PREFIX = "askSourceFile";
const ASK_SOURCE_FILE_SELECT_PREFIX = "askSourceFileSelect";
const SOURCE_FILE_TTL_MS = 30 * 60 * 1000;
const MAX_SOURCE_OPTIONS = 25;
const MAX_SOURCE_LABEL_LENGTH = 100;
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
    pendingTmpfilesPayloads: new Map(),
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

function createAskSourceFileSelectRow(request) {
  if (!request) return null;

  const select = new StringSelectMenuBuilder()
    .setCustomId(createAskSourceFileSelectId(request.id))
    .setPlaceholder(createSourceSelectionPlaceholder(request.sources.length))
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(createAskSourceFileSelectOptions(request.sources));

  return new ActionRowBuilder().addComponents(select);
}

function parseAskSourceFileButtonId(customId) {
  if (!customId.startsWith(`${ASK_SOURCE_FILE_BUTTON_PREFIX}:`)) {
    return null;
  }

  return customId.slice(ASK_SOURCE_FILE_BUTTON_PREFIX.length + 1);
}

function parseAskSourceFileSelectId(customId) {
  if (!customId.startsWith(`${ASK_SOURCE_FILE_SELECT_PREFIX}:`)) {
    return null;
  }

  return customId.slice(ASK_SOURCE_FILE_SELECT_PREFIX.length + 1);
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

function createAskSourceFileSelectId(sourceFileId) {
  return `${ASK_SOURCE_FILE_SELECT_PREFIX}:${sourceFileId}`;
}

function resolveAskSourceSelection(request, selection) {
  const trimmed = selection.trim();
  if (!trimmed) return null;

  const numericSelection = parseSelectionNumber(trimmed);
  if (numericSelection !== null) {
    return request.sources[numericSelection - 1] ?? null;
  }

  const exactMatch = request.sources.find(
    (source) => source.relativePath === trimmed || source.label === trimmed,
  );

  if (exactMatch) return exactMatch;

  return null;
}

function parseSelectionNumber(value) {
  const match = value.match(/^(\d+)$/);
  if (!match) return null;

  const selection = Number(match[1]);
  return Number.isInteger(selection) && selection > 0 ? selection : null;
}

function createSourceSelectionPlaceholder(totalSources) {
  if (totalSources > MAX_SOURCE_OPTIONS) {
    return `Pick 1-${MAX_SOURCE_OPTIONS} of ${totalSources} sources`;
  }

  return `Pick 1-${totalSources} source${totalSources === 1 ? "" : "s"}`;
}

function createAskSourceFileSelectOptions(sources) {
  return sources.slice(0, MAX_SOURCE_OPTIONS).map((source, index) => ({
    label: truncateSelectionLabel(`${index + 1}. ${source.label}`),
    value: String(index + 1),
  }));
}

function truncateSelectionLabel(label) {
  if (label.length <= MAX_SOURCE_LABEL_LENGTH) return label;

  return `${label.slice(0, MAX_SOURCE_LABEL_LENGTH - 1)}…`;
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
  createAskSourceFileSelectRow,
  createAskSourceFileRequest,
  getAskSourceFileRequest,
  parseAskSourceFileButtonId,
  parseAskSourceFileSelectId,
  resolveAskSourceSelection,
  _test: {
    createAskSourceFileSelectId,
    createAskSourceFileSelectOptions,
    createSourceSelectionPlaceholder,
    findSourceFiles,
    parseSelectionNumber,
    truncateSelectionLabel,
    resolveAskSourceSelection,
  },
};
