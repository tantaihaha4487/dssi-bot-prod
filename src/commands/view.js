const { SlashCommandBuilder } = require("@discordjs/builders");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { File } = require("node:buffer");
const { readFile, realpath, stat } = require("node:fs/promises");
const path = require("node:path");
const { dataDir, listDataFiles } = require("../rag/data-loader");

const MAX_FILE_CHOICES = 25;
const TMPFILES_UPLOAD_URL = "https://tmpfiles.org/api/v1/upload";

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
    const selectedFile = interaction.options.getString("file", true);

    await interaction.deferReply();

    try {
      const target = await getViewTarget(selectedFile);
      const fileStats = await stat(target.filePath);

      if (!fileStats.isFile()) {
        throw new Error("Selected path is not a file.");
      }

      if (fileStats.size <= interaction.attachmentSizeLimit) {
        await interaction.editReply({
          content: `Sending \`${target.relativePath}\` (${formatBytes(fileStats.size)}).`,
          files: [new AttachmentBuilder(target.filePath)],
        });
        return;
      }

      await interaction.editReply({
        embeds: [
          createEmbed(
            "File Too Large",
            `\`${target.relativePath}\` is ${formatBytes(fileStats.size)}, which exceeds Discord's ${formatBytes(interaction.attachmentSizeLimit)} attachment limit. Uploading to tmpfiles...`,
          ),
        ],
      });

      const url = await uploadToTmpfiles(target.filePath);

      await interaction.editReply({
        content: `\`${target.relativePath}\` is too large for Discord (${formatBytes(fileStats.size)}).\n${url}`,
        embeds: [],
      });
    } catch (error) {
      console.error("Error viewing knowledge file:", error);

      await interaction.editReply({ embeds: [createErrorEmbed(error)] });
    }
  },
};

async function getViewTarget(file) {
  const root = path.resolve(dataDir);
  const normalizedFile = file.trim().replace(/\\/g, "/").replace(/^\/+/, "");

  if (!normalizedFile || normalizedFile.split("/").some(isInvalidPathPart)) {
    throw new Error("File must be a relative path under `data/`.");
  }

  const filePath = path.resolve(root, normalizedFile);
  assertInsideData(root, filePath);
  assertInsideData(await realpath(root), await realpath(filePath));

  return {
    filePath,
    relativePath: path.relative(root, filePath).split(path.sep).join("/"),
  };
}

function isInvalidPathPart(part) {
  return !part || part === "." || part === ".." || /[<>:"|?*\x00-\x1F]/.test(part);
}

function assertInsideData(root, targetPath) {
  if (targetPath !== root && !targetPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("File must stay inside `data/`.");
  }
}

async function uploadToTmpfiles(filePath) {
  const formData = new FormData();
  const file = new File([await readFile(filePath)], path.basename(filePath));

  formData.append("file", file);

  const response = await fetch(TMPFILES_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`tmpfiles upload failed (${response.status}).`);
  }

  const result = await response.json().catch(() => undefined);
  const url = getTmpfilesUrl(result);

  if (!url) {
    throw new Error("tmpfiles did not return an upload URL.");
  }

  return url;
}

function getTmpfilesUrl(result) {
  return result?.data?.url ?? result?.url;
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

function formatBytes(bytes) {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 1) {
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes >= 1) {
    return `${Number.isInteger(kilobytes) ? kilobytes : kilobytes.toFixed(1)} KB`;
  }

  return `${bytes} bytes`;
}
