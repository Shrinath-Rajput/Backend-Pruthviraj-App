import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    employeeCode: {
      type: String,
      required: [true, "Employee code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: [
        "OWNER",
        "HR",
        "ACCOUNTS",
        "MANAGER",
        "STAFF",
        "SUPERVISOR",
        "EMPLOYEE",
        "SUPER_SUPERVISOR",
      ],
      default: "EMPLOYEE",
      index: true,
    },
    designation: {
      type: String,
      default: "Field Operative",
      trim: true,
    },
    companyName: {
      type: String,
      default: "Pruthviraj Enterprises",
      trim: true,
    },
    // Business data isolation scope (Section 10)
    businessIds: {
      type: [String],
      default: ["pruthviraj-enterprises"],
      index: true,
    },
    assignedSiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      default: null,
      index: true,
    },
    assignedSupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    languagePreference: {
      type: String,
      enum: ["ENG", "मराठी", "हिन्दी"],
      default: "ENG",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    panNumber: {
      type: String,
      trim: true,
      default: null,
    },
    bankDetails: {
      accountNumberMasked: { type: String, default: null },
      bankName: { type: String, default: null },
      ifscCode: { type: String, default: null },
      branch: { type: String, default: null },
    },
    category: {
      type: String,
      default: "Operations",
    },
    salaryConfig: {
      baseSalaryPaise: { type: Number, default: 2500000 }, // INR 25,000.00
      dailyRatePaise: { type: Number, default: 100000 },
      otRatePerHourPaise: { type: Number, default: 20000 },
      hraPaise: { type: Number, default: 600000 },
      conveyancePaise: { type: Number, default: 300000 },
    },
    documents: [
      {
        documentType: { type: String, enum: ["AADHAAR", "PAN", "UAN", "ESIC", "BANK_DOC", "OTHER"] },
        maskedNumber: { type: String, default: "" },
        fileUrl: { type: String, default: "" },
        verified: { type: Boolean, default: false },
      },
    ],
    // Session and Refresh Token Security (Section 7)
    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ role: 1, assignedSiteId: 1 });
userSchema.index({ businessIds: 1, role: 1 });

export const User = mongoose.model("User", userSchema);
export default User;
