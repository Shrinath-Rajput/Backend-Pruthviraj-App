import { z } from "zod";

const phoneRegex = /^(\+91)?[6-9]\d{9}$/;

export const sendOtpSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .refine((val) => phoneRegex.test(val), {
      message: "Please enter a valid 10-digit Indian phone number (with optional +91 prefix).",
    }),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .refine((val) => phoneRegex.test(val), {
      message: "Valid phone number required.",
    }),
  otpCode: z
    .string()
    .trim()
    .length(6, { message: "OTP must be exactly 6 numeric digits." })
    .regex(/^\d+$/, { message: "OTP must contain numeric characters only." }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(10, { message: "Refresh token is required." }),
});

export const registerUserSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phoneNumber: z.string().trim().refine((val) => phoneRegex.test(val)),
  employeeCode: z.string().trim().min(3).max(20),
  role: z.enum([
    "OWNER",
    "HR",
    "ACCOUNTS",
    "MANAGER",
    "STAFF",
    "SUPERVISOR",
    "EMPLOYEE",
    "SUPER_SUPERVISOR",
  ]),
  designation: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  businessIds: z.array(z.string()).optional(),
  assignedSiteId: z.string().optional(),
  languagePreference: z.enum(["ENG", "मराठी", "हिन्दी"]).optional(),
  panNumber: z.string().trim().optional(),
  bankDetails: z
    .object({
      accountNumber: z.string().optional(),
      bankName: z.string().optional(),
      ifscCode: z.string().optional(),
      branch: z.string().optional(),
    })
    .optional(),
  salaryConfig: z
    .object({
      baseSalaryPaise: z.number().optional(),
      dailyRatePaise: z.number().optional(),
      otRatePerHourPaise: z.number().optional(),
      hraPaise: z.number().optional(),
      conveyancePaise: z.number().optional(),
    })
    .optional(),
});

export default {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  registerUserSchema,
};
