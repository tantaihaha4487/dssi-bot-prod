const { EmbedBuilder, escapeMarkdown } = require("discord.js");
const { askKnowledgeBase } = require("../rag/service");

const MESSAGE_CHUNK_LENGTH = 3000;
const MISINFORMATION_NOTICE = "⚠️ AI อาจมีข้อมูลไม่ถูกต้อง";

async function getAskResponseEmbeds(question) {
  const response = await getAskResponse(question);

  return response.embeds;
}

async function getAskResponse(question) {
  const result = await askKnowledgeBase(question);
  const response = formatResponse(result);

  return {
    embeds: chunkMessage(response, MESSAGE_CHUNK_LENGTH).map(createResponseEmbed),
    sources: result.sources,
  };
}

function createAskErrorEmbed(error) {
  return createResponseEmbed(getUserFacingError(error)).setTitle("Ask Failed");
}

function formatResponse(result) {
  const sources = result.sources.length
    ? `\n\nSources:\n${result.sources.map((source) => `- ${formatSource(source)}`).join("\n")}`
    : "";
  return `${result.answer}${sources}`;
}

function formatSource(source) {
  return escapeMarkdown(String(source).normalize("NFC"));
}

function chunkMessage(message, chunkLength) {
  const chunks = [];

  for (let index = 0; index < message.length; index += chunkLength) {
    chunks.push(message.slice(index, index + chunkLength));
  }

  return chunks.length ? chunks : ["No response."];
}

function createResponseEmbed(description) {
  return new EmbedBuilder()
    .setDescription(description)
    .setFooter({ text: MISINFORMATION_NOTICE });
}

function getUserFacingError(error) {
  if (error.message?.startsWith("No chat provider is configured.")) {
    return "RAG is not configured yet. Set one provider API key in .env, for example AI_PROVIDER_OPENROUTER_API_KEY. Fallback providers are optional.";
  }

  if (error.message?.startsWith("Missing embedding")) {
    return `Vector search is not configured yet. ${error.message}`;
  }

  if (error.message === "No supported knowledge files found in data/") {
    return "No knowledge files found. Add .txt, .pdf, or image files to data/ or its subfolders.";
  }

  if (error.message?.startsWith("Missing image text provider API key.")) {
    return `Image text extraction is not configured yet. ${error.message}`;
  }

  if (error.message?.includes("too large for inline extraction")) {
    return error.message;
  }

  if (error?.status === 429 || error?.lc_error_code === "MODEL_RATE_LIMIT") {
    return "AI provider rate limit hit. Retry later or change provider settings in config.yaml.";
  }

  if (error?.message?.includes("Ollama")) {
    return "Ollama embeddings are not reachable. Run with Docker Compose or start Ollama and pull nomic-embed-text.";
  }

  if (error?.code === "ECONNREFUSED" || error?.message?.includes("Qdrant")) {
    return "Qdrant is not reachable. Start it with docker compose up -d qdrant and retry.";
  }

  return "There was an error while answering your question.";
}

module.exports = { createAskErrorEmbed, getAskResponse, getAskResponseEmbeds };
