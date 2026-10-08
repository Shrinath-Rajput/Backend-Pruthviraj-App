import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, "Filename is required"],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, "Original name is required"],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      trim: true,
      index: true,
    },
    size: {
      type: Number,
      required: [true, "File size is required"],
    },
    // The accessible URL link to the image/file stored in MongoDB
    url: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
      index: true,
    },
    storageKey: {
      type: String,
      required: [true, "Storage key is required"],
      trim: true,
    },
    folder: {
      type: String,
      default: "images",
      trim: true,
      index: true,
    },
    businessId: {
      type: String,
      default: "general",
      trim: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    entityType: {
      type: String,
      enum: [
        "IMAGE",
        "SELFIE",
        "DOCUMENT",
        "WORKER_DOC",
        "PURCHASE_ORDER",
        "PAYSLIP",
        "AUDIT",
        "OTHER",
      ],
      default: "IMAGE",
      index: true,
    },
    entityId: {
      type: String,
      default: null,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

uploadSchema.index({ businessId: 1, entityType: 1 });
uploadSchema.index({ createdAt: -1 });

export const Upload = mongoose.model("Upload", uploadSchema);
export default Upload;
