const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const crypto = require("node:crypto");
const { getDataFileTarget } = require("./data-file-delivery");

const ASK_SOURCE_FILE_BUTTON_PREFIX = "askSourceFile";
const SOURCE_FILE_TTL_MS = 30 * 60 * 1000;
const sourceFiles = new Map();

async function createAskSourceFileRequest(sources) {
  const source = await findTopSourceFile(sources);
  if (!source) return null;

  const id = crypto.randomUUID();
  const request = {
    id,
    source,
    createdAt: Date.now(),
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
      .setLabel("Send top source file")
      .setStyle(ButtonStyle.Secondary),
  );
}

function parseAskSourceFileButtonId(customId) {
  if (!customId.startsWith(`${ASK_SOURCE_FILE_BUTTON_PREFIX}:`)) {
    return null;
  }

  return customId.slice(ASK_SOURCE_FILE_BUTTON_PREFIX.length + 1);
}

async function findTopSourceFile(sources) {
  for (const source of sources) {
    try {
      const target = await getDataFileTarget(source);

      return {
        label: source,
        relativePath: target.relativePath,
      };
    } catch {
      // Stale or normalized metadata that no longer points to a file
    }
  }

  return null;
}

function createAskSourceFileButtonId(sourceFileId) {
  return `${ASK_SOURCE_FILE_BUTTON_PREFIX}:${sourceFileId}`;
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
  createAskSourceFileRequest,
  getAskSourceFileRequest,
  parseAskSourceFileButtonId,
};
