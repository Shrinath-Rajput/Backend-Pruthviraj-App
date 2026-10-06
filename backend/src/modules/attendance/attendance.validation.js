import { z } from "zod";

export const punchInSchema = z.object({
  siteId: z.string().min(1, "Site ID is required"),
  latitude: z.number().min(-90).max(90, "Valid latitude is required"),
  longitude: z.number().min(-180).max(180, "Valid longitude is required"),
  deviceId: z.string().optional().default("UNKNOWN_DEVICE"),
  selfieUrl: z.string().url().optional(),
});

export const punchOutSchema = z.object({
  latitude: z.number().min(-90).max(90, "Valid latitude is required"),
  longitude: z.number().min(-180).max(180, "Valid longitude is required"),
  deviceId: z.string().optional().default("UNKNOWN_DEVICE"),
});

export const manualOverrideSchema = z.object({
  attendanceId: z.string().min(1, "Attendance ID is required"),
  status: z.enum(["PRESENT", "HALF_DAY", "LATE", "OVERTIME", "ABSENT", "MANUAL_OVERRIDE"]),
  overrideReason: z.string().min(5, "Override reason must be at least 5 characters"),
  punchInTime: z.string().datetime().optional(),
  punchOutTime: z.string().datetime().optional(),
});

export default {
  punchInSchema,
  punchOutSchema,
  manualOverrideSchema,
};
