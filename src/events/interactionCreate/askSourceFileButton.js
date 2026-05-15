const { EmbedBuilder, MessageFlags } = require("discord.js");
const {
  createDataFileReply,
  getDataFileTarget,
} = require("../../utils/data-file-delivery");
const {
  getAskSourceFileRequest,
  parseAskSourceFileButtonId,
} = require("../../utils/ask-source-file");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const target = await getDataFileTarget(request.source.relativePath);
    const reply = await createDataFileReply(target, interaction.attachmentSizeLimit);

    await interaction.editReply(reply);
  } catch (error) {
    console.error("Error sending ask source file:", error);

    await interaction.editReply({ embeds: [createErrorEmbed(error)] });
  }
};

function createErrorEmbed(error) {
  return new EmbedBuilder()
    .setTitle("Source File Failed")
    .setDescription(
      error.message || "There was an error while sending the source file.",
    );
}
