async function sendPrivateStatus(target, content) {
  if (target.interaction) {
    return sendEphemeralStatus(target.interaction, content);
  }

  if (target.user) {
    return sendDirectMessage(target.user, content);
  }

  return null;
}

async function sendEphemeralStatus(interaction, content) {
  const payload = { content, ephemeral: true };

  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload).catch(() => null);
  }

  return interaction.reply(payload).catch(() => null);
}

async function sendDirectMessage(user, content) {
  try {
    return await user.send(content);
  } catch (error) {
    if (isCannotMessageUser(error)) {
      return null;
    }

    throw error;
  }
}

function isCannotMessageUser(error) {
  return error?.code === 50007;
}

module.exports = { sendPrivateStatus };
