import PDFDocument from "pdfkit";

/**
 * Generate a production-grade Salary Slip PDF using PDFKit
 * @param {Object} data - Payroll, employee, and business details
 * @returns {Promise<Buffer>}
 */
export const generateSalarySlipPdf = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    const {
      companyName = "PRUTHVIRAJ ENTERPRISES & FACILITIES",
      employee = {},
      payPeriod = "September 2026",
      periodStart,
      periodEnd,
      daysScheduled = 24,
      daysWorked = 21,
      overtimeHours = 12,
      earnings = {},
      deductions = {},
      netAmount = 0,
      status = "SLIP_READY",
      disbursalDate = new Date(),
      sha256Seal = "DIGITAL_SEAL_HASH",
      paymentMethod = "NEFT",
      bankAccountMasked = "••••••4892",
    } = data;

    // Header banner
    doc.rect(40, 40, 515, 60).fill("#1A365D");
    doc.fillColor("#FFFFFF").fontSize(18).text(companyName.toUpperCase(), 50, 50, { align: "center" });
    doc.fontSize(11).text("PAYSLIP / SALARY DISBURSEMENT STATEMENT", 50, 75, { align: "center" });

    // Pay Period and Status
    doc.fillColor("#2D3748").fontSize(10);
    doc.text(`Pay Period: ${payPeriod}`, 45, 115);
    doc.text(`Disbursal Date: ${new Date(disbursalDate).toLocaleDateString("en-IN")}`, 380, 115);
    doc.text(`Payment Mode: ${paymentMethod} (${bankAccountMasked})`, 45, 130);
    doc.text(`Status: ${status}`, 380, 130);

    doc.moveTo(40, 150).lineTo(555, 150).stroke("#CBD5E0");

    // Employee Information Box
    doc.rect(40, 160, 515, 65).fill("#F7FAFC").stroke("#E2E8F0");
    doc.fillColor("#1A202C").fontSize(10);
    doc.text(`Employee Name : ${employee.fullName || employee.name || "Worker"}`, 50, 170);
    doc.text(`Employee Code : ${employee.employeeCode || "EMP-0000"}`, 50, 185);
    doc.text(`Designation   : ${employee.designation || "Staff"}`, 50, 200);

    doc.text(`PAN Number    : ${employee.panNumber || "XXXXX0000X"}`, 320, 170);
    doc.text(`UAN / PF No   : ${employee.uanNumber || "100XXXXXXXXX"}`, 320, 185);
    doc.text(`ESIC Number   : ${employee.esicNumber || "310XXXXXXXXX"}`, 320, 200);

    // Attendance Summary Bar
    doc.rect(40, 235, 515, 25).fill("#EDF2F7");
    doc.fillColor("#2B6CB0").fontSize(10);
    doc.text(`Scheduled Days: ${daysScheduled}`, 50, 242);
    doc.text(`Days Worked: ${daysWorked}`, 220, 242);
    doc.text(`Overtime Hours: ${overtimeHours} hrs`, 390, 242);

    // Earnings & Deductions Table
    const tableTop = 275;
    doc.rect(40, tableTop, 255, 22).fill("#E2E8F0");
    doc.rect(300, tableTop, 255, 22).fill("#E2E8F0");
    doc.fillColor("#1A202C").fontSize(10);
    doc.text("EARNINGS (INR)", 50, tableTop + 6, { bold: true });
    doc.text("DEDUCTIONS (INR)", 310, tableTop + 6, { bold: true });

    let currentY = tableTop + 30;
    const formatINR = (val) => `₹ ${(Number(val || 0) / 100).toFixed(2)}`;

    const earningRows = [
      ["Basic Pay", formatINR(earnings.basicPay)],
      ["House Rent Allowance (HRA)", formatINR(earnings.hra)],
      ["Conveyance Allowance", formatINR(earnings.conveyance)],
      ["Overtime Bonus", formatINR(earnings.overtimeBonus)],
    ];

    const deductionRows = [
      ["Provident Fund (PF)", formatINR(deductions.pf)],
      ["Employees' State Insurance (ESIC)", formatINR(deductions.esi || deductions.esic)],
      ["Professional Tax (PT)", formatINR(deductions.professionalTax || deductions.pt)],
      ["Advances / Loans", formatINR(deductions.advances || deductions.loans)],
    ];

    for (let i = 0; i < Math.max(earningRows.length, deductionRows.length); i++) {
      if (earningRows[i]) {
        doc.fillColor("#4A5568").text(earningRows[i][0], 50, currentY);
        doc.fillColor("#1A202C").text(earningRows[i][1], 230, currentY, { align: "right", width: 60 });
      }
      if (deductionRows[i]) {
        doc.fillColor("#4A5568").text(deductionRows[i][0], 310, currentY);
        doc.fillColor("#1A202C").text(deductionRows[i][1], 490, currentY, { align: "right", width: 60 });
      }
      currentY += 20;
    }

    doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).stroke("#CBD5E0");
    currentY += 15;

    // Totals
    doc.fontSize(10);
    doc.fillColor("#1A202C").text("Gross Earnings:", 50, currentY);
    doc.text(formatINR(earnings.grossAmount), 230, currentY, { align: "right", width: 60 });

    doc.text("Total Deductions:", 310, currentY);
    doc.text(formatINR(deductions.totalDeductions), 490, currentY, { align: "right", width: 60 });

    currentY += 30;

    // Net Payable Banner
    doc.rect(40, currentY, 515, 45).fill("#2B6CB0");
    doc.fillColor("#FFFFFF").fontSize(12).text("NET SALARY PAYABLE", 60, currentY + 10);
    doc.fontSize(16).text(formatINR(netAmount), 350, currentY + 12, { align: "right", width: 190 });

    currentY += 65;

    // Cryptographic Seal & Verification
    doc.rect(40, currentY, 515, 60).stroke("#CBD5E0");
    doc.fillColor("#718096").fontSize(8);
    doc.text("TAMPER-PROOF AUDIT SEAL (SHA-256):", 50, currentY + 10);
    doc.fillColor("#2D3748").fontSize(8).text(sha256Seal, 50, currentY + 22, { width: 495 });
    doc.fillColor("#A0AEC0").fontSize(7).text(
      "This is a system-generated payslip. Digitally authenticated via Pruthviraj GeoSpatial Biometric Ledger.",
      50,
      currentY + 45
    );

    doc.end();
  });
};

/**
 * Generate Master Audit PDF report
 */
export const generateAuditReportPdf = (reportData) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    doc.fontSize(18).text("PRUTHVIRAJ WORKFORCE AUDIT REPORT", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Report Type: ${reportData.reportType || "COMPREHENSIVE"}`);
    doc.text(`Date Range: ${reportData.dateRange || "All Time"}`);
    doc.text(`Generated At: ${new Date().toISOString()}`);
    doc.moveDown();

    doc.fontSize(12).text(`Total Records Audited: ${reportData.totalRecords || 0}`);
    doc.moveDown();

    if (reportData.records && Array.isArray(reportData.records)) {
      reportData.records.slice(0, 30).forEach((rec, idx) => {
        doc.fontSize(8).text(`${idx + 1}. [${rec.timestamp || rec.date}] ${rec.type || rec.action} - ${rec.details || rec.status}`);
      });
    }

    doc.end();
  });
};

export default {
  generateSalarySlipPdf,
  generateAuditReportPdf,
};
