import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app.js";
import environment from "../../src/config/environment.js";
import User from "../../src/modules/auth/user.model.js";

describe("Authentication & Session Security Integration Tests (Section 6 & 7)", () => {
  const testPhone = "+919811122233";

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(environment.MONGODB_URI);
    }
    await User.deleteMany({ phoneNumber: testPhone });
  });

  afterAll(async () => {
    await User.deleteMany({ phoneNumber: testPhone });
  });

  it("POST /api/v1/auth/otp/send - should send 6-digit OTP", async () => {
    const res = await request(app)
      .post("/api/v1/auth/otp/send")
      .send({ phoneNumber: testPhone });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expiresIn).toBe(environment.OTP.TTL_SECONDS);
    expect(res.body.data.devOtp).toBeDefined();
    expect(res.body.data.devOtp).toMatch(/^\d{6}$/);
  });

  it("POST /api/v1/auth/otp/verify - should reject invalid OTP with remaining attempts", async () => {
    const res = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ phoneNumber: testPhone, otpCode: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Invalid OTP code");
  });

  it("POST /api/v1/auth/otp/verify - should verify valid OTP and return token pair", async () => {
    // Request new OTP
    const otpRes = await request(app)
      .post("/api/v1/auth/otp/send")
      .send({ phoneNumber: testPhone });

    const devOtp = otpRes.body.data.devOtp;

    const verifyRes = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ phoneNumber: testPhone, otpCode: devOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.accessToken).toBeDefined();
    expect(verifyRes.body.data.refreshToken).toBeDefined();
    expect(verifyRes.body.data.user.phoneNumber).toBe(testPhone);
    // Sensitive token hashes must NOT be returned (Section 63)
    expect(verifyRes.body.data.user.refreshTokenHash).toBeUndefined();
  });

  it("POST /api/v1/auth/refresh - should rotate refresh token and issue new key pair (Section 7)", async () => {
    // 1. Authenticate
    const otpRes = await request(app)
      .post("/api/v1/auth/otp/send")
      .send({ phoneNumber: testPhone });
    const verifyRes = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ phoneNumber: testPhone, otpCode: otpRes.body.data.devOtp });

    const initialRefreshToken = verifyRes.body.data.refreshToken;

    // 2. Rotate token
    const rotateRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: initialRefreshToken });

    expect(rotateRes.status).toBe(200);
    expect(rotateRes.body.data.accessToken).toBeDefined();
    expect(rotateRes.body.data.refreshToken).toBeDefined();
    expect(rotateRes.body.data.refreshToken).not.toEqual(initialRefreshToken);

    // 3. Reuse Detection Test (Section 7 & 63): Re-using the revoked initial token must trigger breach revocation!
    const reuseRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: initialRefreshToken });

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error).toBe("TOKEN_REUSE_DETECTED");
  });
});
