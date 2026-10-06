import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    workingDays: {
      type: Number,
      required: true,
      default: 30,
    },
    presentDays: {
      type: Number,
      required: true,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    leaveDays: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    baseSalary: {
      type: Number,
      required: true,
    },
    earnings: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      grossTotal: { type: Number, default: 0 },
    },
    deductions: {
      tax: { type: Number, default: 0 },
      providentFund: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      penalties: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
    },
    netSalary: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PROCESSED", "PAID"],
      default: "PROCESSED",
      index: true,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentReference: {
      type: String,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate payroll for the same employee, month, and year
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

export const Payroll = mongoose.model("Payroll", payrollSchema);
export default Payroll;
