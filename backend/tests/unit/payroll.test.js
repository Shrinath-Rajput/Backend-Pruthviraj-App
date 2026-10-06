import { describe, it, expect } from "vitest";
import payrollService from "../../src/modules/payroll/payroll.service.js";

describe("Statutory Payroll Calculation Engine Tests (Section 27 & 29)", () => {
  it("should calculate exact salary with PF, ESIC, and PT in integer paise", () => {
    const worker = {
      salaryConfig: {
        baseSalaryPaise: 2000000, // INR 20,000.00
      },
    };

    // 20 present punches out of 24 scheduled days
    const mockPunches = Array.from({ length: 20 }).map(() => ({
      punchType: "CHECK_IN",
      verificationStatus: "VERIFIED",
    }));

    const result = payrollService.calculateWorkerSalary({
      worker,
      attendanceRecords: mockPunches,
      scheduledDays: 24,
      monthIndex: 9, // October
    });

    // Basic = 50% = 10,000 INR = 1,000,000 paise
    expect(result.earnings.basicPay).toBe(1000000);
    // HRA = 30% = 6,000 INR = 600,000 paise
    expect(result.earnings.hra).toBe(600000);
    // Conveyance = 20% = 4,000 INR = 400,000 paise
    expect(result.earnings.conveyance).toBe(400000);
    // Gross = 20,000 INR = 2,000,000 paise
    expect(result.earnings.grossAmount).toBe(2000000);

    // PF = 12% of basic = 120,000 paise (INR 1,200)
    expect(result.deductions.pf).toBe(120000);

    // ESIC: Gross is 2,000,000 paise (<= 2,100,000 limit) -> 0.75% = 15,000 paise (INR 150)
    expect(result.deductions.esi).toBe(15000);

    // Professional Tax: Gross > 10,000 INR -> 20,000 paise (INR 200)
    expect(result.deductions.professionalTax).toBe(20000);

    // 4 absent days loss of pay: (2,000,000 / 24) * 4 = 333,333 paise
    expect(result.deductions.lossOfPay).toBe(Math.round((2000000 / 24) * 4));

    // Net Amount must equal Gross - Total Deductions
    expect(result.netAmount).toBe(
      result.earnings.grossAmount - result.deductions.totalDeductions
    );
    expect(Number.isInteger(result.netAmount)).toBe(true);
  });

  it("should exempt ESIC deduction when gross salary exceeds statutory limit (INR 21,000)", () => {
    const worker = {
      salaryConfig: {
        baseSalaryPaise: 3500000, // INR 35,000.00
      },
    };

    const mockPunches = Array.from({ length: 30 }).map(() => ({
      punchType: "CHECK_IN",
      verificationStatus: "VERIFIED",
    }));

    const result = payrollService.calculateWorkerSalary({
      worker,
      attendanceRecords: mockPunches,
      scheduledDays: 30,
      monthIndex: 9,
    });

    expect(result.earnings.grossAmount).toBe(3500000);
    expect(result.deductions.esi).toBe(0); // ESIC is 0 for high earners
    expect(result.deductions.pf).toBe(Math.round(1750000 * 0.12));
  });
});
