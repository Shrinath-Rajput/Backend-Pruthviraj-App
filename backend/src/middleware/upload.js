import multer from "multer";
import path from "path";
import crypto from "crypto";
import ApiError from "../common/ApiError.js";

// Memory storage keeps buffers in memory for direct S3 / MinIO upload
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      ApiError.badRequest(
        `Unsupported file type '${file.mimetype}'. Allowed types: JPEG, PNG, WEBP, PDF, XLSX, CSV.`,
        { allowedMimeTypes: ALLOWED_MIME_TYPES, receivedMimeType: file.mimetype },
        "UNSUPPORTED_MEDIA_TYPE"
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },
  fileFilter,
});

/**
 * Generate cryptographically safe and structured S3 object keys
 */
export const generateSafeStorageKey = (folder = "uploads", businessId = "general", originalName = "file.bin") => {
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName) || ".bin";
  return `${folder}/${businessId}/${timestamp}_${randomHex}${ext.toLowerCase()}`;
};

export const singleUpload = (fieldName) => upload.single(fieldName);
export const multipleUpload = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);
export const fieldsUpload = (fieldsArray) => upload.fields(fieldsArray);

export { uploadToS3, getPresignedDownloadUrl } from "../config/s3.js";

export default {
  upload,
  generateSafeStorageKey,
  singleUpload,
  multipleUpload,
  fieldsUpload,
};

