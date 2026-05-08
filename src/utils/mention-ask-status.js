const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const crypto = require("node:crypto");

const MENTION_ASK_STATUS_BUTTON_PREFIX = "mentionAskStatus";
const STATUS_TTL_MS = 30 * 60 * 1000;
const statuses = new Map();

function createMentionAskStatus({ userId, content }) {
  const id = crypto.randomUUID();
  const status = {
    id,
    userId,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  statuses.set(id, status);
  pruneExpiredStatuses();

  return status;
}

function updateMentionAskStatus(id, content) {
  const status = statuses.get(id);

  if (!status) return null;

  status.content = content;
  status.updatedAt = Date.now();

  return status;
}

function getMentionAskStatus(id) {
  pruneExpiredStatuses();

  return statuses.get(id) ?? null;
}

function createMentionAskStatusButtonRow(statusId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(createMentionAskStatusButtonId(statusId))
      .setLabel("View queue status")
      .setStyle(ButtonStyle.Secondary),
  );
}

function parseMentionAskStatusButtonId(customId) {
  if (!customId.startsWith(`${MENTION_ASK_STATUS_BUTTON_PREFIX}:`)) {
    return null;
  }

  return customId.slice(MENTION_ASK_STATUS_BUTTON_PREFIX.length + 1);
}

function createMentionAskStatusButtonId(statusId) {
  return `${MENTION_ASK_STATUS_BUTTON_PREFIX}:${statusId}`;
}

function pruneExpiredStatuses() {
  const expiresBefore = Date.now() - STATUS_TTL_MS;

  for (const [id, status] of statuses) {
    if (status.updatedAt < expiresBefore) {
      statuses.delete(id);
    }
  }
}

module.exports = {
  createMentionAskStatus,
  createMentionAskStatusButtonRow,
  getMentionAskStatus,
  parseMentionAskStatusButtonId,
  updateMentionAskStatus,
};
