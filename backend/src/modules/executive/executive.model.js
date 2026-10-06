import mongoose from "mongoose";

/**
 * 1. Global Geofence Policy (Section 39)
 */
const globalPolicySchema = new mongoose.Schema(
  {
    defaultRadiusMeters: {
      type: Number,
      default: 50.0,
      required: true,
    },
    gpsAccuracyThresholdMeters: {
      type: Number,
      default: 20.0,
      required: true,
    },
    faceMatchConfidenceThreshold: {
      type: Number,
      default: 80.0,
      required: true,
    },
    requireSupervisorApprovalForOverrides: {
      type: Boolean,
      default: true,
    },
    autoFlagProxyAttempts: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    auditTrail: [
      {
        action: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changes: Object,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const GlobalGeofencePolicy = mongoose.model("GlobalGeofencePolicy", globalPolicySchema);

/**
 * 2. Audit Violation Model (Section 44 & PDF Section 3.2)
 */
const auditViolationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
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
    violationType: {
      type: String,
      enum: ["OUT_OF_BOUNDS_PUNCH", "FACE_MISMATCH", "GEOFENCE_BREACH", "PROXY_ATTEMPT"],
      required: true,
      index: true,
    },
    attemptedCoordinates: {
      type: [Number], // [lon, lat]
      required: true,
    },
    distanceMeters: {
      type: Number,
      required: true,
    },
    details: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["BLOCKED", "FLAGGED", "INVESTIGATING", "RESOLVED"],
      default: "BLOCKED",
      index: true,
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

export const AuditViolation = mongoose.model("AuditViolation", auditViolationSchema);

/**
 * 3. Centralized Approval Model (Section 37)
 */
const approvalSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["EXPENSE", "SALARY", "PAYMENT", "PURCHASE"],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    amountPaise: {
      type: Number,
      default: 0,
    },
    comments: {
      type: String,
      default: "",
    },
    history: [
      {
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        comment: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Approval = mongoose.model("Approval", approvalSchema);

/**
 * 4. Billing & Invoice Model (Section 34)
 */
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      enum: ["pruthviraj-enterprises", "pruthviraj-facilities"],
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      default: null,
    },
    billingPeriod: {
      type: String,
      required: true, // e.g. "October 2026"
    },
    items: [
      {
        description: String,
        quantity: Number,
        ratePaise: Number,
        amountPaise: Number,
      },
    ],
    subtotalPaise: {
      type: Number,
      required: true,
    },
    taxPaise: {
      type: Number,
      default: 0,
    },
    totalPaise: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    paidAmountPaise: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);

/**
 * 5. Expense Model (Section 36)
 */
const expenseSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
      enum: ["pruthviraj-enterprises", "pruthviraj-facilities"],
      index: true,
    },
    category: {
      type: String,
      enum: ["SALARY", "OFFICE", "PF", "ESIC", "PT", "TRAVEL", "EQUIPMENT", "OTHER"],
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attachments: [String],
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    approvalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Approval",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Expense = mongoose.model("Expense", expenseSchema);

/**
 * 6. Bank Account Model (Section 35)
 */
const bankAccountSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
      enum: ["pruthviraj-enterprises", "pruthviraj-facilities"],
      index: true,
    },
    bankName: {
      type: String,
      enum: ["HDFC Bank", "Saraswat Bank"],
      required: true,
    },
    accountNumberMasked: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      default: "CURRENT",
    },
    ifscCode: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      default: "Pune",
    },
    balancePaise: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const BankAccount = mongoose.model("BankAccount", bankAccountSchema);

/**
 * 7. Audit Export Job Model (Section 41)
 */
const auditExportJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
    },
    reportType: {
      type: String,
      required: true,
    },
    dateRange: {
      type: String,
      default: "ALL",
    },
    fileFormat: {
      type: String,
      enum: ["PDF", "CSV"],
      default: "PDF",
    },
    status: {
      type: String,
      enum: ["PROCESSING", "READY", "FAILED"],
      default: "PROCESSING",
      index: true,
    },
    downloadUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AuditExportJob = mongoose.model("AuditExportJob", auditExportJobSchema);

export default {
  GlobalGeofencePolicy,
  AuditViolation,
  Approval,
  Invoice,
  Expense,
  BankAccount,
  AuditExportJob,
};
