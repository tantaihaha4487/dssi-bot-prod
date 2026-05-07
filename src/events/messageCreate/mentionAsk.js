const { createAskErrorEmbed, getAskResponseEmbeds } = require("../../utils/ask-response");
const { MentionAskQueue } = require("../../utils/mention-ask-queue");
const { sendPrivateStatus } = require("../../utils/private-status");

const mentionAskQueue = new MentionAskQueue();

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

  const queueEntry = mentionAskQueue.enqueue(message.author.id, {
    onStart: () =>
      notifyUserPrivately(
        message,
        { user: message.author },
        createProcessingStatus(message, question),
      ),
    run: () => respondToMentionAsk(message, question),
    onError: (error) => handleMentionAskFailure(message, error),
  });

  if (queueEntry.queued) {
    await notifyUserPrivately(
      message,
      { user: message.author },
      createQueuedStatus(message, queueEntry.position, question),
    );
  }
};

async function respondToMentionAsk(message, question) {
  const embeds = await getAskResponseEmbeds(question);
  const [firstEmbed, ...restEmbeds] = embeds;
  await sendMessageFeedback(message, { embeds: [firstEmbed] });

  for (const embed of restEmbeds) {
    await message.channel.send({ embeds: [embed] });
  }
}

async function handleMentionAskFailure(message, error) {
  console.error("Error answering RAG question from mention:", error);

  await sendMessageFeedback(message, { embeds: [createAskErrorEmbed(error)] });
}

async function sendMessageFeedback(message, payload) {
  try {
    return await message.reply(payload);
  } catch (error) {
    if (error?.code !== 160002) throw error;

    if (typeof payload === "string") {
      return message.channel.send(`${message.author} ${payload}`);
    }

    return message.channel.send({ content: `${message.author}`, ...payload });
  }
}

function getMentionQuestion(message) {
  const botMention = new RegExp(`<@!?${message.client.user.id}>`, "g");

  return message.content.replace(botMention, "").trim();
}

function createQueuedStatus(message, position, question) {
  return [
    `Your ask request is queued at position ${position}.`,
    createRequestLocationText(message),
    `Question: ${truncateQuestion(question)}`,
    "I will DM you again when processing starts.",
  ].join("\n");
}

function createProcessingStatus(message, question) {
  return [
    "Your ask request is now processing.",
    createRequestLocationText(message),
    `Question: ${truncateQuestion(question)}`,
  ].join("\n");
}

function createRequestLocationText(message) {
  if (!message.guild) {
    return "Source: direct message";
  }

  return `Source: ${message.guild.name} / #${message.channel.name}`;
}

function truncateQuestion(question) {
  if (question.length <= 180) return question;

  return `${question.slice(0, 177)}...`;
}

async function notifyUserPrivately(message, target, content) {
  try {
    await sendPrivateStatus(target, content);
  } catch (error) {
    console.warn(
      `Failed to send private mention-ask status to user ${message.author.id}:`,
      error,
    );
  }
}
