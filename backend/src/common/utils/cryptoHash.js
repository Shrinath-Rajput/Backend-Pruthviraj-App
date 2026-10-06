import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hash plain text password using bcrypt
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Compare plain text password against bcrypt hash
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * SHA-256 hash generator for tokens, OTPs, and general strings
 */
export const hashSha256 = (content) => {
  return crypto.createHash("sha256").update(String(content)).digest("hex");
};

/**
 * Generate cryptographically secure 6-digit numeric OTP
 */
export const generateSecureOtp = (length = 6) => {
  const digits = "0123456789";
  const bytes = crypto.randomBytes(length);
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
};

/**
 * Generate cryptographically secure random hex token
 */
export const generateSecureToken = (byteLength = 32) => {
  return crypto.randomBytes(byteLength).toString("hex");
};

/**
 * Deterministic SHA-256 attendance hash generator
 * Ensures canonical serialization of immutable fields
 */
export const calculateAttendanceRecordHash = ({
  userId,
  siteId,
  punchTimestamp,
  punchType,
  coordinates,
  photoHash = "no_photo",
  prevRecordHash = "GENESIS_BLOCK",
}) => {
  const canonicalPayload = {
    userId: String(userId),
    siteId: String(siteId),
    punchTimestamp: new Date(punchTimestamp).toISOString(),
    punchType: String(punchType).toUpperCase(),
    coordinates: [
      Number(coordinates[0]).toFixed(6), // lon
      Number(coordinates[1]).toFixed(6), // lat
    ],
    photoHash: String(photoHash),
    prevRecordHash: String(prevRecordHash || "GENESIS_BLOCK"),
  };

  // Deterministic JSON stringify by sorted keys
  const serialized = JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort());
  return crypto.createHash("sha256").update(serialized).digest("hex");
};

/**
 * Verify integrity of a chain of attendance records
 */
export const verifyLedgerChainIntegrity = (records = []) => {
  if (!records || records.length === 0) return { isValid: true, brokenAtId: null };

  for (let i = 0; i < records.length; i++) {
    const current = records[i];
    const prevHash = i === 0 ? (current.prevRecordHash || "GENESIS_BLOCK") : records[i - 1].sha256Hash;

    const recalculated = calculateAttendanceRecordHash({
      userId: current.userId,
      siteId: current.siteId,
      punchTimestamp: current.punchTimestamp,
      punchType: current.punchType,
      coordinates: current.location.coordinates,
      photoHash: current.photoHash || "no_photo",
      prevRecordHash: prevHash,
    });

    if (current.sha256Hash !== recalculated) {
      return {
        isValid: false,
        brokenAtId: current._id,
        index: i,
        expected: recalculated,
        actual: current.sha256Hash,
      };
    }
  }

  return { isValid: true, brokenAtId: null };
};

/**
 * Mask sensitive data (Aadhaar, Bank Account, PAN)
 */
export const maskSensitiveString = (str, visibleStart = 2, visibleEnd = 4) => {
  if (!str || typeof str !== "string") return "";
  if (str.length <= visibleStart + visibleEnd) return "••••" + str.slice(-2);
  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const maskedLength = Math.max(4, str.length - (visibleStart + visibleEnd));
  return `${start}${"•".repeat(maskedLength)}${end}`;
};

export default {
  hashPassword,
  comparePassword,
  hashSha256,
  generateSecureOtp,
  generateSecureToken,
  calculateAttendanceRecordHash,
  verifyLedgerChainIntegrity,
  maskSensitiveString,
};
