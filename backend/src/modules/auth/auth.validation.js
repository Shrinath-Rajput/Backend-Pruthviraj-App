import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["EMPLOYEE", "SUPERVISOR", "SUPER_SUPERVISOR"]).default("EMPLOYEE"),
  designation: z.string().optional(),
  employeeCode: z.string().min(3, "Employee code is required"),
  siteId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const requestOtpSchema = z.object({
  phone: z.string().min(10, "Phone number is required"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10, "Phone number is required"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export default {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  changePasswordSchema,
};
