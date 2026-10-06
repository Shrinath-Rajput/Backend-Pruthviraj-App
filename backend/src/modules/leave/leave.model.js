import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["CASUAL", "SICK", "EARNED", "UNPAID"],
      required: true,
      default: "CASUAL",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: [0.5, "Minimum leave duration is 0.5 days"],
    },
    reason: {
      type: String,
      required: [true, "Reason for leave is required"],
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewComment: {
      type: String,
      default: null,
      trim: true,
    },
    documentUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

export const Leave = mongoose.model("Leave", leaveSchema);
export default Leave;
