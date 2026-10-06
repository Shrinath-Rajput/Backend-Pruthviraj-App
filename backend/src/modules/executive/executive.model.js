import mongoose from "mongoose";

const geofencePolicySchema = new mongoose.Schema(
  {
    policyName: {
      type: String,
      required: true,
      default: "Standard Organization Geofence & Operations Policy",
    },
    defaultRadiusMeters: {
      type: Number,
      required: true,
      default: 150,
    },
    strictGeofenceEnforcement: {
      type: Boolean,
      default: true,
    },
    allowManualOverride: {
      type: Boolean,
      default: true,
    },
    autoPunchOutHours: {
      type: Number,
      default: 12, // Automatically close unattended sessions after 12h
    },
    maxDailyOvertimeHours: {
      type: Number,
      default: 4,
    },
    auditTrail: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        targetResource: { type: String, default: "" },
        details: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ExecutivePolicy = mongoose.model("ExecutivePolicy", geofencePolicySchema);
export default ExecutivePolicy;
