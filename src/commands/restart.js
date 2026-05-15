const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder, MessageFlags } = require("discord.js");
const { canUseAdminCommand } = require("../rag/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart the bot process and let Docker bring it back"),

  async execute(interaction) {
    if (!canUseAdminCommand(interaction)) {
      await interaction.reply({
        content: `Only users listed in \`DISCORD_ADMIN_USER_IDS\` or members with \`DISCORD_MODERATOR_ROLE_IDS\` can use this command. Your user ID is \`${interaction.user.id}\`.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Restarting...")
            .setDescription(
              "Stopping the bot process. Docker will start it again in a few seconds.",
            ),
        ],
      });

      setTimeout(() => {
        console.log("Restarting bot process via /restart command.");
        process.exit(0);
      }, 1000).unref();
    } catch (error) {
      console.error("Error during restart:", error);

      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Restart Failed")
              .setDescription(
                error.message || "Could not restart the bot connection.",
              ),
            ],
        });
      } catch {
        // Interaction token may already be gone
      }
    }
  },
};
