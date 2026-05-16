const {
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const {
  createDataFileReply,
  getDataFileTarget,
} = require("../../utils/data-file-delivery");
const {
  createAskSourceFileModal,
  getAskSourceFileRequest,
  parseAskSourceFileButtonId,
  parseAskSourceFileModalId,
  resolveAskSourceSelection,
} = require("../../utils/ask-source-file");

module.exports = async (interaction) => {
  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
    return;
  }

  if (interaction.isModalSubmit()) {
    await handleModalSubmitInteraction(interaction);
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

  const modal = createAskSourceFileModal(sourceFileId);
  if (!modal) {
    await interaction.reply({
      content: "This source file button has expired. Ask again if you need a fresh file link.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(modal);
}

async function handleModalSubmitInteraction(interaction) {
  const sourceFileId = parseAskSourceFileModalId(interaction.customId);
  if (!sourceFileId) return;

  const request = getAskSourceFileRequest(sourceFileId);

  if (!request) {
    await interaction.reply({
      content: "This source file button has expired. Ask again if you need a fresh file link.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const selection = interaction.fields.getTextInputValue("sourceSelection");
  const source = resolveAskSourceSelection(request, selection);

  if (!source) {
    await interaction.reply({
      content: createInvalidSelectionMessage(request),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (request.cachedTmpfilesPayloads.has(source.relativePath)) {
      await interaction.editReply(request.cachedTmpfilesPayloads.get(source.relativePath));
      return;
    }

    const target = await getDataFileTarget(source.relativePath);
    const reply = await createDataFileReply(target, interaction.attachmentSizeLimit);

    if (reply.deliveryKind === "tmpfiles") {
      request.cachedTmpfilesPayloads.set(source.relativePath, reply.payload);
    }

    await interaction.editReply(reply.payload);
  } catch (error) {
    console.error("Error sending ask source file:", error);

    await interaction.editReply({ embeds: [createErrorEmbed(error)] });
  }
}

function createInvalidSelectionMessage(request) {
  const previewSources = request.sources.slice(0, 25);
  const preview = previewSources
    .map((source, index) => `${index + 1}. ${truncateSelectionLabel(source.label)}`)
    .join("\n");
  const suffix = request.sources.length > previewSources.length
    ? `\n...and ${request.sources.length - previewSources.length} more`
    : "";

  return truncateMessage([
    "Keep the list and add `pick: 1` or `pick: path/to/file` on the last line.",
    `${preview}${suffix}`,
  ].join("\n\n"));
}

function truncateSelectionLabel(label) {
  return truncateMessage(label, 120);
}

function truncateMessage(message, maxLength = 1900) {
  if (message.length <= maxLength) return message;

  return `${message.slice(0, maxLength - 1)}…`;
}

function createErrorEmbed(error) {
  return new EmbedBuilder()
    .setTitle("Source File Failed")
    .setDescription(
      error.message || "There was an error while sending the source file.",
    );
}

module.exports._test = {
  createInvalidSelectionMessage,
  truncateMessage,
  truncateSelectionLabel,
};
