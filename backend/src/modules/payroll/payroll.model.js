import mongoose from "mongoose";

/**
 * 1. Payroll Run Model (Section 27)
 * Tracks bulk monthly payroll execution workflow per business
 */
const payrollRunSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
      enum: ["pruthviraj-enterprises", "pruthviraj-facilities"],
      index: true,
    },
    payPeriod: {
      type: String,
      required: true, // e.g. "October 2026"
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "CALCULATING",
        "PENDING_APPROVAL",
        "APPROVED",
        "PROCESSING",
        "DISBURSED",
        "FAILED",
        "CLOSED",
      ],
      default: "DRAFT",
      index: true,
    },
    totalGrossPaise: {
      type: Number,
      default: 0,
    },
    totalDeductionsPaise: {
      type: Number,
      default: 0,
    },
    totalNetPaise: {
      type: Number,
      default: 0,
    },
    totalEmployees: {
      type: Number,
      default: 0,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    disbursedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

payrollRunSchema.index({ businessId: 1, payPeriod: 1 }, { unique: true });

export const PayrollRun = mongoose.model("PayrollRun", payrollRunSchema);

/**
 * 2. Salary Slip / Payroll Item Model (Section 27 & 28)
 * Stores integer minor units (paise) for exact zero-drift monetary arithmetic
 */
const salarySlipSchema = new mongoose.Schema(
  {
    payrollRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollRun",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      enum: ["pruthviraj-enterprises", "pruthviraj-facilities"],
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      default: null,
    },
    payPeriod: {
      type: String,
      required: true, // "October 2026"
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    daysScheduled: {
      type: Number,
      required: true,
      default: 30,
    },
    daysWorked: {
      type: Number,
      required: true,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    earnings: {
      basicPay: { type: Number, default: 0 }, // in paise
      hra: { type: Number, default: 0 },
      conveyance: { type: Number, default: 0 },
      overtimeBonus: { type: Number, default: 0 },
      grossAmount: { type: Number, default: 0 },
    },
    deductions: {
      pf: { type: Number, default: 0 }, // in paise
      esi: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      advances: { type: Number, default: 0 },
      loans: { type: Number, default: 0 },
      lossOfPay: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
    },
    netAmount: {
      type: Number,
      required: true, // in paise
    },
    status: {
      type: String,
      enum: ["SLIP_READY", "DISBURSED", "PENDING"],
      default: "SLIP_READY",
      index: true,
    },
    disbursalDate: {
      type: Date,
      default: null,
    },
    pdfStorageUrl: {
      type: String,
      default: null,
    },
    sha256Seal: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

salarySlipSchema.index({ userId: 1, payPeriod: 1 }, { unique: true });

export const SalarySlip = mongoose.model("SalarySlip", salarySlipSchema);

/**
 * 3. Statutory Compliance Record Model (Section 29)
 */
const complianceRecordSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    period: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["PF", "ESIC", "PT"],
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
      index: true,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    reference: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ComplianceRecord = mongoose.model("ComplianceRecord", complianceRecordSchema);

export default {
  PayrollRun,
  SalarySlip,
  ComplianceRecord,
};
