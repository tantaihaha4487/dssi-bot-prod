const {
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const {
  createDataFileReply,
  getDataFileTarget,
} = require("../../utils/data-file-delivery");
const {
  createAskSourceFileSelectRow,
  getAskSourceFileRequest,
  parseAskSourceFileButtonId,
  parseAskSourceFileSelectId,
  resolveAskSourceSelection,
} = require("../../utils/ask-source-file");

module.exports = async (interaction) => {
  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    await handleSelectInteraction(interaction);
  }
};

async function handleButtonInteraction(interaction) {
  const sourceFileId = parseAskSourceFileButtonId(interaction.customId);
  if (!sourceFileId) return;

  const request = getAskSourceFileRequest(sourceFileId);

  if (!request) {
    await interaction.reply({
      content: "This source file button has expired. Ask again if you need a fresh file link.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const components = createAskSourceFileSelectRow(request);
  if (!components) {
    await interaction.reply({
      content: "This source file button has expired. Ask again if you need a fresh file link.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: createPickerMessage(request.sources.length),
    components: [components],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleSelectInteraction(interaction) {
  const sourceFileId = parseAskSourceFileSelectId(interaction.customId);
  if (!sourceFileId) return;

  const request = getAskSourceFileRequest(sourceFileId);

  if (!request) {
    await interaction.reply({
      content: "This source file button has expired. Ask again if you need a fresh file link.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const selection = interaction.values[0];
  const source = resolveAskSourceSelection(request, selection);

  if (!source) {
    await interaction.reply({
      content: "This source selection is no longer available. Open the picker again.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const reply = await getSourceReply(request, source.relativePath, interaction.attachmentSizeLimit);
    await interaction.editReply(reply.payload);
  } catch (error) {
    console.error("Error sending ask source file:", error);

    await interaction.editReply({ embeds: [createErrorEmbed(error)] });
  }
}

async function getSourceReply(
  request,
  relativePath,
  attachmentSizeLimit,
  loadReply = createSourceReply,
) {
  if (request.cachedTmpfilesPayloads.has(relativePath)) {
    return {
      payload: request.cachedTmpfilesPayloads.get(relativePath),
      deliveryKind: "tmpfiles",
    };
  }

  if (request.pendingTmpfilesPayloads.has(relativePath)) {
    return request.pendingTmpfilesPayloads.get(relativePath);
  }

  const replyPromise = loadReply(relativePath, attachmentSizeLimit);
  request.pendingTmpfilesPayloads.set(relativePath, replyPromise);

  try {
    const reply = await replyPromise;

    if (reply.deliveryKind === "tmpfiles") {
      request.cachedTmpfilesPayloads.set(relativePath, reply.payload);
    }

    return reply;
  } finally {
    request.pendingTmpfilesPayloads.delete(relativePath);
  }
}

async function createSourceReply(relativePath, attachmentSizeLimit) {
  const target = await getDataFileTarget(relativePath);
  return createDataFileReply(target, attachmentSizeLimit);
}

function createPickerMessage(totalSources) {
  if (totalSources > 25) {
    return `Pick a source file from the first 25 of ${totalSources} results.`;
  }

  return `Pick a source file from ${totalSources} result${totalSources === 1 ? "" : "s"}.`;
}

function createErrorEmbed(error) {
  return new EmbedBuilder()
    .setTitle("Source File Failed")
    .setDescription(
      error.message || "There was an error while sending the source file.",
    );
}

module.exports._test = {
  createPickerMessage,
  getSourceReply,
};
