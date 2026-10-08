import fs from "fs";
import path from "path";
import crypto from "crypto";
import environment from "./environment.js";

// Determine absolute uploads directory
export const UPLOAD_ROOT_DIR = path.resolve(
  process.cwd(),
  environment.STORAGE?.UPLOAD_DIR || "uploads"
);

// Ensure base upload root directory exists on initial module load
if (!fs.existsSync(UPLOAD_ROOT_DIR)) {
  fs.mkdirSync(UPLOAD_ROOT_DIR, { recursive: true });
}

/**
 * Generate cryptographically safe and structured storage relative keys
 * Format: [folder]/[businessId]/[timestamp]_[randomHex].[ext]
 */
export const generateSafeStorageKey = (
  folder = "uploads",
  businessId = "general",
  originalName = "file.bin"
) => {
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName) || ".bin";

  // Sanitize folder and businessId to prevent path traversal
  const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "") || "uploads";
  const cleanBusiness = businessId.replace(/[^a-zA-Z0-9_-]/g, "") || "general";

  return `${cleanFolder}/${cleanBusiness}/${timestamp}_${randomHex}${ext.toLowerCase()}`;
};

/**
 * Save file buffer directly into local uploads directory
 */
export const saveLocalFile = async ({
  buffer,
  key,
  folder = "uploads",
  businessId = "general",
  originalName = "file.bin",
  mimeType = "application/octet-stream",
}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Invalid file buffer provided for storage.");
  }

  const storageKey = key || generateSafeStorageKey(folder, businessId, originalName);
  const normalizedKey = storageKey.replace(/\\/g, "/");

  // Prevent directory traversal attacks
  const safeRelativePath = path.normalize(normalizedKey).replace(/^(\.\.(\/|\\|$))+/, "");
  const targetFilePath = path.join(UPLOAD_ROOT_DIR, safeRelativePath);
  const targetDir = path.dirname(targetFilePath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  await fs.promises.writeFile(targetFilePath, buffer);

  const publicUrl = `/uploads/${normalizedKey}`;

  return {
    key: normalizedKey,
    filePath: targetFilePath,
    url: publicUrl,
    size: buffer.length,
    mimeType,
    originalName,
  };
};

/**
 * Safely delete file from local storage
 */
export const deleteLocalFile = async (key) => {
  if (!key) return false;
  try {
    const normalizedKey = key.replace(/^\/?uploads\//, "").replace(/\\/g, "/");
    const safeRelativePath = path.normalize(normalizedKey).replace(/^(\.\.(\/|\\|$))+/, "");
    const targetFilePath = path.join(UPLOAD_ROOT_DIR, safeRelativePath);

    if (fs.existsSync(targetFilePath)) {
      await fs.promises.unlink(targetFilePath);
      return true;
    }
  } catch (err) {
    console.error(`Failed to delete local file: ${key}`, err);
  }
  return false;
};

/**
 * Check if local file exists
 */
export const localFileExists = (key) => {
  if (!key) return false;
  const normalizedKey = key.replace(/^\/?uploads\//, "").replace(/\\/g, "/");
  const safeRelativePath = path.normalize(normalizedKey).replace(/^(\.\.(\/|\\|$))+/, "");
  const targetFilePath = path.join(UPLOAD_ROOT_DIR, safeRelativePath);
  return fs.existsSync(targetFilePath);
};

/**
 * Get web download URL for a storage key
 */
export const getDownloadUrl = (key) => {
  if (!key) return null;
  const normalizedKey = key.startsWith("/") ? key : `/uploads/${key}`;
  return normalizedKey;
};

export const getPresignedDownloadUrl = getDownloadUrl;

export default {
  UPLOAD_ROOT_DIR,
  generateSafeStorageKey,
  saveLocalFile,
  deleteLocalFile,
  localFileExists,
  getDownloadUrl,
  getPresignedDownloadUrl,
};
