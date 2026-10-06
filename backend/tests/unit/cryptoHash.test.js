import { describe, it, expect } from "vitest";
import {
  calculateAttendanceRecordHash,
  verifyLedgerChainIntegrity,
  generateSecureOtp,
  maskSensitiveString,
  hashSha256,
} from "../../src/common/utils/cryptoHash.js";

describe("Cryptographic Hash & Ledger Unit Tests (Section 21)", () => {
  it("should generate deterministic SHA-256 hash for identical attendance inputs", () => {
    const payload = {
      userId: "650000000000000000000001",
      siteId: "650000000000000000000002",
      punchTimestamp: new Date("2026-10-06T08:00:00.000Z"),
      punchType: "CHECK_IN",
      coordinates: [73.8567, 18.5204],
      photoHash: "abcd1234photo",
      prevRecordHash: "GENESIS_BLOCK",
    };

    const hash1 = calculateAttendanceRecordHash(payload);
    const hash2 = calculateAttendanceRecordHash(payload);

    expect(hash1).toBeTypeOf("string");
    expect(hash1.length).toBe(64);
    expect(hash1).toEqual(hash2);
  });

  it("should change hash when any immutable field is modified (anti-tamper)", () => {
    const base = {
      userId: "650000000000000000000001",
      siteId: "650000000000000000000002",
      punchTimestamp: new Date("2026-10-06T08:00:00.000Z"),
      punchType: "CHECK_IN",
      coordinates: [73.8567, 18.5204],
      photoHash: "photo_hash_original",
      prevRecordHash: "GENESIS_BLOCK",
    };

    const hash1 = calculateAttendanceRecordHash(base);
    const tampered = calculateAttendanceRecordHash({
      ...base,
      punchType: "CHECK_OUT",
    });

    expect(hash1).not.toEqual(tampered);
  });

  it("should verify valid cryptographic block chain integrity", () => {
    const block0Hash = calculateAttendanceRecordHash({
      userId: "user1",
      siteId: "site1",
      punchTimestamp: new Date("2026-10-06T08:00:00Z"),
      punchType: "CHECK_IN",
      coordinates: [73.85, 18.52],
      photoHash: "p0",
      prevRecordHash: "GENESIS_BLOCK",
    });

    const block1Hash = calculateAttendanceRecordHash({
      userId: "user1",
      siteId: "site1",
      punchTimestamp: new Date("2026-10-06T17:00:00Z"),
      punchType: "CHECK_OUT",
      coordinates: [73.85, 18.52],
      photoHash: "p1",
      prevRecordHash: block0Hash,
    });

    const records = [
      {
        _id: "rec0",
        userId: "user1",
        siteId: "site1",
        punchTimestamp: new Date("2026-10-06T08:00:00Z"),
        punchType: "CHECK_IN",
        location: { coordinates: [73.85, 18.52] },
        photoHash: "p0",
        sha256Hash: block0Hash,
        prevRecordHash: "GENESIS_BLOCK",
      },
      {
        _id: "rec1",
        userId: "user1",
        siteId: "site1",
        punchTimestamp: new Date("2026-10-06T17:00:00Z"),
        punchType: "CHECK_OUT",
        location: { coordinates: [73.85, 18.52] },
        photoHash: "p1",
        sha256Hash: block1Hash,
        prevRecordHash: block0Hash,
      },
    ];

    const result = verifyLedgerChainIntegrity(records);
    expect(result.isValid).toBe(true);
  });

  it("should detect tampered historical record in ledger chain", () => {
    const records = [
      {
        _id: "rec0",
        userId: "user1",
        siteId: "site1",
        punchTimestamp: new Date("2026-10-06T08:00:00Z"),
        punchType: "CHECK_IN",
        location: { coordinates: [73.85, 18.52] },
        photoHash: "p0",
        sha256Hash: "fake_tampered_hash_0000000000000000000000000000000000000000000000",
        prevRecordHash: "GENESIS_BLOCK",
      },
    ];

    const result = verifyLedgerChainIntegrity(records);
    expect(result.isValid).toBe(false);
    expect(result.brokenAtId).toBe("rec0");
  });

  it("should generate cryptographically secure 6-digit OTP", () => {
    const otp = generateSecureOtp(6);
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("should mask sensitive strings correctly", () => {
    expect(maskSensitiveString("+919876543210", 3, 2)).toMatch(/^\+91•+10$/);
    expect(maskSensitiveString("123456789012", 0, 4)).toMatch(/^•+9012$/);
  });
});
