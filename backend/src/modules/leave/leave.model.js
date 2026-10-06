import mongoose from "mongoose";

/**
 * Leave Balance Model (Section 26)
 */
const leaveBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
      index: true,
    },
    casualLeave: {
      total: { type: Number, default: 12 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 12 },
    },
    sickLeave: {
      total: { type: Number, default: 10 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 10 },
    },
    earnedLeave: {
      total: { type: Number, default: 15 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 15 },
    },
  },
  {
    timestamps: true,
  }
);

leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

export const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);

/**
 * Leave Application Model (Section 26)
 */
const leaveApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      default: null,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["CASUAL", "SICK", "EARNED"],
      required: true,
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
      min: [1, "Leave duration must be at least 1 day"],
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBySupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    replacementWorkerId: {
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
    },
  },
  {
    timestamps: true,
  }
);

leaveApplicationSchema.index({ userId: 1, status: 1 });
leaveApplicationSchema.index({ businessId: 1, status: 1 });

export const LeaveApplication = mongoose.model("LeaveApplication", leaveApplicationSchema);

export default {
  LeaveBalance,
  LeaveApplication,
};
