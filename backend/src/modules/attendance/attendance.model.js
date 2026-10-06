import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
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
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    // Punch In Details
    punchInTime: {
      type: Date,
      required: true,
    },
    punchInLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    punchInDistanceMeters: {
      type: Number,
      required: true,
    },
    punchInInsideGeofence: {
      type: Boolean,
      required: true,
      default: true,
    },
    punchInHash: {
      type: String,
      required: true, // SHA-256 Tamper-proof hash
    },
    // Punch Out Details
    punchOutTime: {
      type: Date,
      default: null,
    },
    punchOutLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    punchOutDistanceMeters: {
      type: Number,
      default: null,
    },
    punchOutInsideGeofence: {
      type: Boolean,
      default: null,
    },
    punchOutHash: {
      type: String,
      default: null,
    },
    totalHoursWorked: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["PRESENT", "HALF_DAY", "LATE", "OVERTIME", "ABSENT", "MANUAL_OVERRIDE"],
      default: "PRESENT",
      index: true,
    },
    isOverridden: {
      type: Boolean,
      default: false,
    },
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    overrideReason: {
      type: String,
      default: null,
    },
    deviceId: {
      type: String,
      default: "MOBILE_APP",
    },
    selfieUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for rapid lookups
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ siteId: 1, date: 1 });
attendanceSchema.index({ punchInLocation: "2dsphere" });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
