const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, MessageFlags } = require("discord.js");
const { listDataFiles } = require("../rag/data-loader");
const { canUseViewCommand } = require("../rag/config");
const {
  createDataFileReply,
  getDataFileTarget,
} = require("../utils/data-file-delivery");

const MAX_FILE_CHOICES = 25;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("view")
    .setDescription("Send a knowledge file from data/ into chat")
    .addStringOption((option) =>
      option
        .setName("file")
        .setDescription("File under data/")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    if (!canUseViewCommand(interaction)) {
      await interaction.respond([]);
      return;
    }

    const focused = interaction.options.getFocused().trim().toLowerCase();
    const files = await listDataFiles();
    const choices = files
      .map(({ relativePath }) => relativePath)
      .filter((relativePath) => relativePath.toLowerCase().includes(focused))
      .slice(0, MAX_FILE_CHOICES)
      .map((relativePath) => ({
        name: relativePath,
        value: relativePath,
      }));

    await interaction.respond(choices);
  },

  async execute(interaction) {
    if (!canUseViewCommand(interaction)) {
      await replyNotAllowed(interaction);
      return;
    }

    const selectedFile = interaction.options.getString("file", true);

    await interaction.deferReply();

    try {
      const target = await getDataFileTarget(selectedFile);
      const reply = await createDataFileReply(target, interaction.attachmentSizeLimit);

      await interaction.editReply(reply);
    } catch (error) {
      console.error("Error viewing knowledge file:", error);

      await interaction.editReply({ embeds: [createErrorEmbed(error)] });
    }
  },
};

async function replyNotAllowed(interaction) {
  await interaction.reply({
    content: `Only users listed in \`DISCORD_ADMIN_USER_IDS\`, members with \`DISCORD_MODERATOR_ROLE_IDS\`, or everyone when \`commands.view.allowEveryone\` is enabled can use this command. Your user ID is \`${interaction.user.id}\`.`,
    flags: MessageFlags.Ephemeral,
  });
}

function createErrorEmbed(error) {
  return createEmbed("View Failed", getUserFacingError(error));
}

function createEmbed(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description);
}

function getUserFacingError(error) {
  return error.message || "There was an error while sending the file.";
}
