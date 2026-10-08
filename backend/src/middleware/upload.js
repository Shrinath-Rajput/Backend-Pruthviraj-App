import multer from "multer";
import ApiError from "../common/ApiError.js";
import {
  generateSafeStorageKey,
  saveLocalFile,
  deleteLocalFile,
  localFileExists,
  getDownloadUrl,
  getPresignedDownloadUrl,
} from "../config/storage.js";

// Memory storage keeps file buffers accessible for SHA-256 hashing, verification & disk storage
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
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
        `Unsupported file type '${file.mimetype}'. Allowed types: JPEG, PNG, WEBP, GIF, PDF, XLSX, CSV.`,
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
    fileSize: 15 * 1024 * 1024, // 15 MB maximum
  },
  fileFilter,
});

export const singleUpload = (fieldName) => upload.single(fieldName);
export const multipleUpload = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
export const fieldsUpload = (fieldsArray) => upload.fields(fieldsArray);

/**
 * Flexible middleware that accepts any of the common file field names
 */
export const flexibleSingleUpload = (fieldNames = ["image", "file", "document", "photo", "selfiePhoto"]) => {
  return (req, res, next) => {
    upload.fields(fieldNames.map((name) => ({ name, maxCount: 1 })))(req, res, (err) => {
      if (err) return next(err);
      if (req.files) {
        for (const name of fieldNames) {
          if (req.files[name] && req.files[name][0]) {
            req.file = req.files[name][0];
            break;
          }
        }
      }
      next();
    });
  };
};

export {
  generateSafeStorageKey,
  saveLocalFile,
  deleteLocalFile,
  localFileExists,
  getDownloadUrl,
  getPresignedDownloadUrl,
};

export const uploadToStorage = saveLocalFile;

export default {
  upload,
  generateSafeStorageKey,
  singleUpload,
  multipleUpload,
  fieldsUpload,
  flexibleSingleUpload,
  saveLocalFile,
  deleteLocalFile,
  localFileExists,
  uploadToStorage,
  getDownloadUrl,
  getPresignedDownloadUrl,
};
