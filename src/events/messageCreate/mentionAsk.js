const { createAskErrorEmbed, getAskResponseEmbeds } = require("../../utils/ask-response");
const { MentionAskQueue } = require("../../utils/mention-ask-queue");
const {
  createMentionAskStatus,
  createMentionAskStatusButtonRow,
  updateMentionAskStatus,
} = require("../../utils/mention-ask-status");

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

  const requestStatus = createMentionAskStatus({
    userId: message.author.id,
    content: createAcceptedStatus(message, question),
  });
  const queueEntry = mentionAskQueue.enqueue(message.author.id, {
    onStart: () =>
      updateMentionAskStatus(
        requestStatus.id,
        createProcessingStatus(message, question),
      ),
    run: () => respondToMentionAsk(message, question, requestStatus.id, statusPrompt),
    onError: (error) => handleMentionAskFailure(message, question, error, requestStatus.id, statusPrompt),
  });

  if (queueEntry.queued) {
    updateMentionAskStatus(
      requestStatus.id,
      createQueuedStatus(message, queueEntry.position, question),
    );
  }

  const statusPrompt = await sendStatusButtonPrompt(message, requestStatus.id);
};

async function respondToMentionAsk(message, question, statusId, statusPrompt) {
  const embeds = await getAskResponseEmbeds(question);
  const [firstEmbed, ...restEmbeds] = embeds;
  await sendMessageFeedback(message, { embeds: [firstEmbed] });

  for (const embed of restEmbeds) {
    await message.channel.send({ embeds: [embed] });
  }

  updateMentionAskStatus(statusId, createCompletedStatus(message, question));
  await deleteStatusPrompt(statusPrompt);
}

async function handleMentionAskFailure(message, question, error, statusId, statusPrompt) {
  console.error("Error answering RAG question from mention:", error);
  updateMentionAskStatus(statusId, createFailedStatus(message, question));

  await sendMessageFeedback(message, { embeds: [createAskErrorEmbed(error)] });
  await deleteStatusPrompt(statusPrompt);
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

async function sendStatusButtonPrompt(message, statusId) {
  return sendMessageFeedback(message, {
    content: `${message.author} your ask request was received. Use the button to view your private queue status.`,
    components: [createMentionAskStatusButtonRow(statusId)],
  });
}

async function deleteStatusPrompt(statusPrompt) {
  if (!statusPrompt) return;

  try {
    await statusPrompt.delete();
  } catch (error) {
    if (error?.code !== 10008) {
      // 10008 = Unknown Message (already deleted or inaccessible)
      console.warn("Failed to delete mention ask status prompt:", error);
    }
  }
}

function createAcceptedStatus(message, question) {
  return [
    "Your ask request was accepted.",
    createRequestLocationText(message),
    `Question: ${truncateQuestion(question)}`,
    "Status: waiting for queue placement.",
  ].join("\n");
}

function createQueuedStatus(message, position, question) {
  return [
    `Your ask request is queued at position ${position}.`,
    createRequestLocationText(message),
    `Question: ${truncateQuestion(question)}`,
    "Press the status button again later to refresh this private status.",
  ].join("\n");
}

function createProcessingStatus(message, question) {
  return [
    "Your ask request is now processing.",
    createRequestLocationText(message),
    `Question: ${truncateQuestion(question)}`,
  ].join("\n");
}

function createCompletedStatus(message, question) {
  return [
    "Your ask request is complete.",
    createRequestLocationText(message),
    `Question: ${truncateQuestion(question)}`,
    "The answer was posted in the original channel.",
  ].join("\n");
}

function createFailedStatus(message, question) {
  return [
    "Your ask request failed.",
    createRequestLocationText(message),
    `Question: ${truncateQuestion(question)}`,
    "An error message was posted in the original channel.",
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

