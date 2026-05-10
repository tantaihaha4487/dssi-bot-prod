// Invalid ASCII filename characters (Windows-invalid + control chars)
const INVALID_FILENAME_CHARS = /[<>:"|?*\x00-\x1F]/;
const INVALID_FILENAME_CHARS_GLOBAL = /[<>:"|?*\x00-\x1F]/g;

// Characters to keep in filenames: Unicode letters, marks, numbers, safe punctuation
const KEEP_CHARS_GLOBAL = /[^\p{L}\p{M}\p{N}\-._ ~]/gu;

function normalizePathSegment(segment, { replaceInvalid = false } = {}) {
  const normalized = segment.normalize("NFC");

  if (!replaceInvalid) return normalized;

  return normalized
    .replace(INVALID_FILENAME_CHARS_GLOBAL, "_")
    .replace(KEEP_CHARS_GLOBAL, "_");
}

function normalizeSourcePath(source) {
  return source.normalize("NFC").replace(/\\/g, "/");
}

module.exports = {
  INVALID_FILENAME_CHARS,
  normalizePathSegment,
  normalizeSourcePath,
};
