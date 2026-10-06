import mongoose from "mongoose";

/**
 * 1. Attendance Record Model (Cryptographic Ledger) (Section 17)
 */
const attendanceRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      enum: ["pruthviraj-enterprises", "pruthviraj-facilities"],
      index: true,
    },
    punchType: {
      type: String,
      enum: ["CHECK_IN", "CHECK_OUT"],
      required: true,
    },
    punchTimestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    gpsAccuracyMeters: {
      type: Number,
      required: true,
      default: 5.0,
    },
    isInsideGeofence: {
      type: Boolean,
      required: true,
      default: true,
    },
    distanceFromCentroidMeters: {
      type: Number,
      required: true,
      default: 0,
    },
    selfiePhotoUrl: {
      type: String,
      default: null,
    },
    photoHash: {
      type: String,
      default: "no_photo",
    },
    biometricMatchScore: {
      type: Number,
      default: 100.0,
    },
    verificationStatus: {
      type: String,
      enum: ["VERIFIED", "SUPERVISOR_OVERRIDE", "FLAGGED_BREACH", "REJECTED"],
      default: "VERIFIED",
      index: true,
    },
    isManualOverride: {
      type: Boolean,
      default: false,
    },
    overrideSupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    overrideReason: {
      type: String,
      default: null,
    },
    // SHA-256 Chained Cryptographic Ledger (Section 21)
    sha256Hash: {
      type: String,
      required: true,
      index: true,
    },
    prevRecordHash: {
      type: String,
      default: "GENESIS_BLOCK",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (Section 48)
attendanceRecordSchema.index({ userId: 1, punchTimestamp: -1 });
attendanceRecordSchema.index({ siteId: 1, punchTimestamp: -1 });
attendanceRecordSchema.index({ businessId: 1, punchTimestamp: -1 });
attendanceRecordSchema.index({ location: "2dsphere" });

export const AttendanceRecord = mongoose.model("AttendanceRecord", attendanceRecordSchema);

/**
 * 2. Shifts Model (Section 25)
 */
const shiftSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    shiftName: {
      type: String,
      required: true, // e.g. "Day Shift (08:00 - 17:00)"
      trim: true,
    },
    startTime: {
      type: String, // "08:00"
      required: true,
    },
    endTime: {
      type: String, // "17:00"
      required: true,
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
    },
    isOtEligible: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Shift = mongoose.model("Shift", shiftSchema);

/**
 * 3. Shift Allocations Model (Section 25)
 */
const shiftAllocationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    businessId: {
      type: String,
      required: true,
    },
    effectiveDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    otEnabled: {
      type: Boolean,
      default: true,
    },
    assignedBySupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent conflicting shift allocations for same user on same date
shiftAllocationSchema.index({ userId: 1, effectiveDate: 1 }, { unique: true });
shiftAllocationSchema.index({ siteId: 1, effectiveDate: 1 });

export const ShiftAllocation = mongoose.model("ShiftAllocation", shiftAllocationSchema);

/**
 * 4. Attendance Audit Trail (Section 22)
 */
const attendanceAuditSchema = new mongoose.Schema(
  {
    attendanceRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceRecord",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ["PUNCH_CREATED", "OVERRIDE_MODIFIED", "BREACH_FLAGGED", "EXCEL_IMPORTED"],
      required: true,
    },
    originalState: {
      type: Object,
      default: {},
    },
    newState: {
      type: Object,
      default: {},
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const AttendanceAudit = mongoose.model("AttendanceAudit", attendanceAuditSchema);

export default {
  AttendanceRecord,
  Shift,
  ShiftAllocation,
  AttendanceAudit,
};
