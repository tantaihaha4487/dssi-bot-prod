const {
  getMentionAskStatus,
  parseMentionAskStatusButtonId,
} = require("../../utils/mention-ask-status");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  const statusId = parseMentionAskStatusButtonId(interaction.customId);
  if (!statusId) return;

  const status = getMentionAskStatus(statusId);

  if (!status) {
    await interaction.reply({
      content: "This queue status has expired. Ask again if you need a fresh status.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.user.id !== status.userId) {
    await interaction.reply({
      content: "This queue status belongs to another user.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: status.content,
    ephemeral: true,
  });
};
