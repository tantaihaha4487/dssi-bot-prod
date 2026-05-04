const { createAskErrorEmbed, getAskResponseEmbeds } = require("../../utils/ask-response");

module.exports = async (message) => {
  if (message.author.bot) return;
  if (!message.client.user) return;
  if (!message.mentions.users.has(message.client.user.id)) return;

  const question = getMentionQuestion(message);

  if (!question) {
    await sendMessageFeedback(
      message,
      `Mention me with a question, for example: ${message.client.user} what's DSSI`,
    );
    return;
  }

  const thinkingReply = await sendMessageFeedback(message, "Thinking...");

  try {
    const embeds = await getAskResponseEmbeds(question);
    const [firstEmbed, ...restEmbeds] = embeds;

    await thinkingReply.edit({ content: "", embeds: [firstEmbed] });

    for (const embed of restEmbeds) {
      await message.channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Error answering RAG question from mention:", error);

    await thinkingReply.edit({ content: "", embeds: [createAskErrorEmbed(error)] });
  }
};

async function sendMessageFeedback(message, content) {
  try {
    return await message.reply(content);
  } catch (error) {
    if (error?.code !== 160002) throw error;

    return message.channel.send(`${message.author} ${content}`);
  }
}

function getMentionQuestion(message) {
  const botMention = new RegExp(`<@!?${message.client.user.id}>`, "g");

  return message.content.replace(botMention, "").trim();
}
