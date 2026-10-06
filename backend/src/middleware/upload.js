import multer from "multer";
import path from "path";
import ApiError from "../common/ApiError.js";

// Use memory storage for direct processing / AWS S3 uploads
const storage = multer.memoryStorage();

// File type filter for image and document uploads
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type '${file.mimetype}'. Only JPEG, PNG, WEBP, and PDF files are allowed.`
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max limit
  },
  fileFilter,
});

export const singleUpload = (fieldName) => upload.single(fieldName);
export const multipleUpload = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

export default upload;
