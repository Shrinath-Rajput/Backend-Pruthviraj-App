import { z } from "zod";

export const punchAttendanceSchema = z.object({
  punchType: z.enum(["CHECK_IN", "CHECK_OUT"]),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(500).default(5.0),
  siteId: z.string().min(12, { message: "Valid site identifier is required." }),
  shiftId: z.string().optional(),
});

export const attendanceOverrideSchema = z.object({
  workerId: z.string().min(12, { message: "Valid worker identifier is required." }),
  action: z.enum(["CHECK_IN", "CHECK_OUT"]),
  overrideReason: z.string().min(5, { message: "Override reason must contain at least 5 characters." }),
  siteId: z.string().optional(),
  shiftId: z.string().optional(),
});

export const bulkAttendanceSchema = z.object({
  siteId: z.string().min(12),
  shiftId: z.string().optional(),
  supervisorLat: z.coerce.number().min(-90).max(90),
  supervisorLon: z.coerce.number().min(-180).max(180),
  records: z.array(
    z.object({
      userId: z.string().min(12),
      punchType: z.enum(["CHECK_IN", "CHECK_OUT"]).default("CHECK_IN"),
      verificationStatus: z.enum(["VERIFIED", "SUPERVISOR_OVERRIDE"]).default("SUPERVISOR_OVERRIDE"),
    })
  ).min(1, { message: "At least one crew record is required for bulk punch." }),
});

export const monthlyQuerySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2040).optional(),
  siteId: z.string().optional(),
  userId: z.string().optional(),
  businessId: z.string().optional(),
});

export const createShiftSchema = z.object({
  siteId: z.string().min(12),
  businessId: z.enum(["pruthviraj-enterprises", "pruthviraj-facilities"]),
  shiftName: z.string().min(2),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Time format must be HH:MM" }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Time format must be HH:MM" }),
  gracePeriodMinutes: z.coerce.number().default(15),
  isOtEligible: z.boolean().default(true),
});

export const allocateShiftSchema = z.object({
  userId: z.string().min(12),
  siteId: z.string().min(12),
  shiftId: z.string().min(12),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date format must be YYYY-MM-DD" }),
  otEnabled: z.boolean().default(true),
});

export default {
  punchAttendanceSchema,
  attendanceOverrideSchema,
  bulkAttendanceSchema,
  monthlyQuerySchema,
  createShiftSchema,
  allocateShiftSchema,
};
