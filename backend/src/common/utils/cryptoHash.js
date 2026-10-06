import crypto from "crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt
 * @param {string} password
 * @returns {Promise<string>}
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare plain text password with hashed password
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Generate a SHA-256 tamper-proof attendance record digital signature
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.siteId
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string|Date} params.timestamp
 * @param {string} [params.deviceId]
 * @returns {string} SHA-256 Hex Digest
 */
export const generateAttendanceHash = ({
  userId,
  siteId,
  latitude,
  longitude,
  timestamp,
  deviceId = "unknown",
}) => {
  const normalizedTime = new Date(timestamp).toISOString();
  const rawData = `${userId}:${siteId}:${latitude.toFixed(6)}:${longitude.toFixed(6)}:${normalizedTime}:${deviceId}`;
  return crypto.createHash("sha256").update(rawData).digest("hex");
};

/**
 * Generate secure alphanumeric OTP code
 * @param {number} [length=6]
 * @returns {string}
 */
export const generateOtp = (length = 6) => {
  const digits = "0123456789";
  let otp = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % digits.length];
  }
  return otp;
};

/**
 * Generate cryptographically secure random token (e.g. for refresh or reset tokens)
 * @param {number} [byteLength=32]
 * @returns {string}
 */
export const generateSecureToken = (byteLength = 32) => {
  return crypto.randomBytes(byteLength).toString("hex");
};

export default {
  hashPassword,
  comparePassword,
  generateAttendanceHash,
  generateOtp,
  generateSecureToken,
};
