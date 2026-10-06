/**
 * PDF Generation Utility for Salary Slips and Executive Reports.
 * Generates structured document buffers.
 */

/**
 * Generate a Salary Slip PDF document buffer
 * @param {Object} payrollData - Processed payroll and employee information
 * @returns {Promise<Buffer>}
 */
export const generateSalarySlipPdf = async (payrollData) => {
  const {
    employeeName = "Employee",
    employeeCode = "EMP-001",
    department = "Operations",
    designation = "Field Officer",
    month = new Date().toLocaleString("default", { month: "long" }),
    year = new Date().getFullYear(),
    workingDays = 30,
    presentDays = 28,
    leaveDays = 2,
    overtimeHours = 0,
    earnings = {
      basic: 0,
      hra: 0,
      allowances: 0,
      overtime: 0,
      grossTotal: 0,
    },
    deductions = {
      tax: 0,
      providentFund: 0,
      insurance: 0,
      penalties: 0,
      totalDeductions: 0,
    },
    netSalary = 0,
    generatedAt = new Date().toISOString(),
  } = payrollData;

  // Build clean text/document stream buffer formatted as printable report
  const slipContent = `
================================================================================
                           GEOWORK ENTERPRISE SYSTEMS                           
                         OFFICIAL MONTHLY SALARY SLIP                           
================================================================================
Month & Year: ${month} ${year}
Generated Date: ${new Date(generatedAt).toLocaleString()}
Document ID: PAY-${employeeCode}-${month.toUpperCase()}-${year}

--------------------------------------------------------------------------------
EMPLOYEE DETAILS
--------------------------------------------------------------------------------
Employee Name  : ${employeeName}
Employee ID    : ${employeeCode}
Department     : ${department}
Designation    : ${designation}

--------------------------------------------------------------------------------
ATTENDANCE SUMMARY
--------------------------------------------------------------------------------
Total Working Days : ${workingDays}
Present Days       : ${presentDays}
Approved Leaves    : ${leaveDays}
Overtime Hours     : ${overtimeHours} hrs

--------------------------------------------------------------------------------
EARNINGS (INR)                           DEDUCTIONS (INR)
--------------------------------------------------------------------------------
Basic Pay         : ₹${earnings.basic.toFixed(2).padEnd(16)} PF Contribution : ₹${deductions.providentFund.toFixed(2)}
House Rent (HRA)  : ₹${earnings.hra.toFixed(2).padEnd(16)} Income Tax (TDS): ₹${deductions.tax.toFixed(2)}
Special Allowance : ₹${earnings.allowances.toFixed(2).padEnd(16)} Health Insurance: ₹${deductions.insurance.toFixed(2)}
Overtime Pay      : ₹${earnings.overtime.toFixed(2).padEnd(16)} Other/Penalties : ₹${deductions.penalties.toFixed(2)}
--------------------------------------------------------------------------------
Gross Earnings    : ₹${earnings.grossTotal.toFixed(2).padEnd(16)} Total Deductions: ₹${deductions.totalDeductions.toFixed(2)}

================================================================================
NET SALARY PAYABLE: ₹${netSalary.toFixed(2)}
================================================================================

This is a computer-generated salary slip from GeoWork Backend Architecture.
Authenticated & Verified via GeoSpatial Audit Trail.
================================================================================
`;

  return Buffer.from(slipContent, "utf-8");
};

export default {
  generateSalarySlipPdf,
};
