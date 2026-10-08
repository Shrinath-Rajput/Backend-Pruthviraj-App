import path from "path";
import { Upload } from "./upload.model.js";
import { saveLocalFile, deleteLocalFile } from "../../config/storage.js";
import ApiError from "../../common/ApiError.js";

class UploadService {
  /**
   * Save uploaded file to the local uploads directory and persist metadata & link in MongoDB
   */
  async saveUpload({
    buffer,
    originalName = "upload.bin",
    mimeType = "application/octet-stream",
    folder = "images",
    businessId = "general",
    uploadedBy = null,
    entityType = "IMAGE",
    entityId = null,
    metadata = {},
  }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw ApiError.badRequest("Invalid file buffer provided for upload.");
    }

    // 1. Save file to local disk inside uploads folder
    const storageResult = await saveLocalFile({
      buffer,
      folder,
      businessId,
      originalName,
      mimeType,
    });

    // 2. Persist file details and accessible URL link into MongoDB
    const uploadDoc = await Upload.create({
      filename: path.basename(storageResult.key),
      originalName,
      mimeType,
      size: storageResult.size,
      url: storageResult.url,
      storageKey: storageResult.key,
      folder,
      businessId,
      uploadedBy,
      entityType,
      entityId,
      metadata,
    });

    return {
      url: storageResult.url,
      storageKey: storageResult.key,
      upload: uploadDoc,
    };
  }

  /**
   * Query all uploaded images and file links from MongoDB with pagination
   */
  async getUploads({
    businessId,
    entityType,
    folder,
    page = 1,
    limit = 20,
    allowedBusinessIds = [],
  }) {
    const query = {};

    if (allowedBusinessIds.length > 0) {
      query.businessId = { $in: allowedBusinessIds };
    }

    if (businessId) {
      if (allowedBusinessIds.length > 0 && !allowedBusinessIds.includes(businessId)) {
        throw ApiError.forbidden("Access denied to requested business uploads.");
      }
      query.businessId = businessId;
    }

    if (entityType) query.entityType = entityType;
    if (folder) query.folder = folder;

    const skip = (Number(page) - 1) * Number(limit);
    const [uploads, total] = await Promise.all([
      Upload.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("uploadedBy", "fullName employeeCode role"),
      Upload.countDocuments(query),
    ]);

    return {
      uploads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    };
  }

  /**
   * Get single upload record by ID from MongoDB
   */
  async getUploadById(id, allowedBusinessIds = []) {
    const upload = await Upload.findById(id).populate("uploadedBy", "fullName employeeCode role");
    if (!upload) {
      throw ApiError.notFound("Upload record not found in MongoDB.");
    }

    if (
      allowedBusinessIds.length > 0 &&
      upload.businessId !== "general" &&
      !allowedBusinessIds.includes(upload.businessId)
    ) {
      throw ApiError.forbidden("Access denied to upload from unauthorized business.");
    }

    return upload;
  }

  /**
   * Delete uploaded file from both local uploads folder and MongoDB
   */
  async deleteUpload(id, allowedBusinessIds = []) {
    const upload = await this.getUploadById(id, allowedBusinessIds);

    // Remove from physical disk
    await deleteLocalFile(upload.storageKey);

    // Remove from MongoDB
    await Upload.findByIdAndDelete(id);

    return { success: true, message: "File removed from disk and link deleted from MongoDB." };
  }
}

export default new UploadService();
