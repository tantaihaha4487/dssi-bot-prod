const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { canUseAdminCommand } = require("../rag/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart the bot connection without killing the process"),

  async execute(interaction) {
    if (!canUseAdminCommand(interaction)) {
      await interaction.reply({
        content: `Only users listed in \`DISCORD_ADMIN_USER_IDS\` or members with \`DISCORD_MODERATOR_ROLE_IDS\` can use this command. Your user ID is \`${interaction.user.id}\`.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Restarting...")
            .setDescription(
              "Disconnecting from Discord and reconnecting. The bot will be back in a few seconds.",
            ),
        ],
      });

      const client = interaction.client;

      // Graceful disconnect: destroy() is async — must await so the WebSocket
      // teardown completes before we call login(), preventing race conditions.
      await client.destroy();

      // Re-login to re-establish the connection.
      // The ClientReady event will fire again when the bot is back online.
      await client.login(process.env.BOT_TOKEN);

      console.log("Bot restarted successfully via /restart command.");
    } catch (error) {
      console.error("Error during restart:", error);

      // Attempt to reply even after destroy; interaction may still be valid
      // for a short window after destroy, but catch if it fails.
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
        // Interaction token may have expired after destroy; log only.
      }
    }
  },
};
