import { Router } from "express";
import uploadController from "./upload.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorizeBusiness } from "../../middleware/authorize.js";
import { singleUpload, multipleUpload } from "../../middleware/upload.js";

const router = Router();

// Require authentication for upload operations
router.use(authenticate);
router.use(authorizeBusiness());

// Single file/image upload
router.post(
  "/image",
  singleUpload("image"),
  uploadController.uploadImage
);

// Generic single file upload (aliases to uploadImage)
router.post(
  "/",
  singleUpload("file"),
  uploadController.uploadImage
);

// Multiple image upload
router.post(
  "/multiple",
  multipleUpload("images", 10),
  uploadController.uploadMultiple
);

// List uploads & image links from MongoDB
router.get("/", uploadController.getUploads);

// Get specific upload metadata by ID
router.get("/:id", uploadController.getUploadById);

// Delete uploaded file and MongoDB link record
router.delete("/:id", uploadController.deleteUpload);

export default router;
