const { AttachmentBuilder } = require("discord.js");
const { File } = require("node:buffer");
const { readFile, realpath, stat } = require("node:fs/promises");
const path = require("node:path");
const { dataDir } = require("../rag/data-loader");

const DEFAULT_ATTACHMENT_SIZE_LIMIT = 8 * 1024 * 1024;
const TMPFILES_UPLOAD_URL = "https://tmpfiles.org/api/v1/upload";

async function getDataFileTarget(file) {
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

async function createDataFileReply(target, attachmentSizeLimit) {
  const fileStats = await stat(target.filePath);

  if (!fileStats.isFile()) {
    throw new Error("Selected path is not a file.");
  }

  const sizeLimit = attachmentSizeLimit ?? DEFAULT_ATTACHMENT_SIZE_LIMIT;

  if (fileStats.size <= sizeLimit) {
    return {
      payload: {
        content: `Sending \`${target.relativePath}\` (${formatBytes(fileStats.size)}).`,
        files: [new AttachmentBuilder(target.filePath)],
      },
      deliveryKind: "attachment",
    };
  }

  const url = await uploadToTmpfiles(target.filePath);

  return {
    payload: {
      content: `\`${target.relativePath}\` is too large for Discord (${formatBytes(fileStats.size)}).\n${url}`,
    },
    deliveryKind: "tmpfiles",
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

module.exports = {
  createDataFileReply,
  formatBytes,
  getDataFileTarget,
  uploadToTmpfiles,
};
