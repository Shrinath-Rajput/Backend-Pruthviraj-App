import uploadService from "./upload.service.js";
import ApiResponse from "../../common/ApiResponse.js";
import ApiError from "../../common/ApiError.js";

class UploadController {
  /**
   * Upload single image or file, save to uploads folder, and store link in MongoDB
   */
  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        throw ApiError.badRequest("No image file provided for upload.");
      }

      const businessId =
        req.body.businessId ||
        (req.businessIds && req.businessIds[0]) ||
        "general";

      const folder = req.body.folder || "images";
      const entityType = req.body.entityType || "IMAGE";
      const entityId = req.body.entityId || null;

      let metadata = {};
      if (req.body.metadata) {
        try {
          metadata = typeof req.body.metadata === "string" ? JSON.parse(req.body.metadata) : req.body.metadata;
        } catch {
          metadata = { raw: req.body.metadata };
        }
      }

      const result = await uploadService.saveUpload({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        folder,
        businessId,
        uploadedBy: req.user?._id || req.user?.id || null,
        entityType,
        entityId,
        metadata,
      });

      return res
        .status(201)
        .json(
          ApiResponse.created(
            { url: result.url, upload: result.upload },
            "Image uploaded successfully and link stored in MongoDB."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Upload multiple images/files
   */
  async uploadMultiple(req, res, next) {
    try {
      const files = req.files || [];
      if (!files.length) {
        throw ApiError.badRequest("No files uploaded.");
      }

      const businessId =
        req.body.businessId ||
        (req.businessIds && req.businessIds[0]) ||
        "general";
      const folder = req.body.folder || "images";
      const entityType = req.body.entityType || "IMAGE";

      const results = [];
      for (const file of files) {
        const item = await uploadService.saveUpload({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          folder,
          businessId,
          uploadedBy: req.user?._id || req.user?.id || null,
          entityType,
        });
        results.push({ url: item.url, upload: item.upload });
      }

      return res
        .status(201)
        .json(
          ApiResponse.created(
            results,
            `${results.length} files uploaded successfully and links stored in MongoDB.`
          )
        );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Query all uploaded images/files from MongoDB
   */
  async getUploads(req, res, next) {
    try {
      const { businessId, entityType, folder, page, limit } = req.query;
      const allowedBusinessIds = req.businessIds || [];

      const result = await uploadService.getUploads({
        businessId,
        entityType,
        folder,
        page,
        limit,
        allowedBusinessIds,
      });

      return res
        .status(200)
        .json(ApiResponse.success(result, "Upload records fetched from MongoDB."));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single upload metadata from MongoDB
   */
  async getUploadById(req, res, next) {
    try {
      const upload = await uploadService.getUploadById(
        req.params.id,
        req.businessIds || []
      );
      return res
        .status(200)
        .json(ApiResponse.success(upload, "Upload record retrieved successfully."));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete uploaded file from folder and MongoDB
   */
  async deleteUpload(req, res, next) {
    try {
      const result = await uploadService.deleteUpload(
        req.params.id,
        req.businessIds || []
      );
      return res.status(200).json(ApiResponse.success(result, "Upload deleted."));
    } catch (err) {
      next(err);
    }
  }
}

export default new UploadController();
