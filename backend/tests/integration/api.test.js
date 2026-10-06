import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import environment from "../../src/config/environment.js";
import User from "../../src/modules/auth/user.model.js";
import { LeaveApplication, LeaveBalance } from "../../src/modules/leave/leave.model.js";

describe("Core REST API Endpoints Integration Tests", () => {
  let ownerToken;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(environment.MONGODB_URI);
    }

    // Seed database first
    await request(app).post("/api/v1/executive/seed");

    const owner = await User.findOne({ role: "OWNER" });
    ownerToken = jwt.sign(
      {
        id: owner._id,
        role: "OWNER",
        businessIds: ["pruthviraj-enterprises", "pruthviraj-facilities"],
      },
      environment.JWT.ACCESS_SECRET,
      { expiresIn: "1h" }
    );
  });

  it("GET /health - should return healthy UP status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("UP");
  });

  it("GET /health/ready - should return MongoDB connection readiness", async () => {
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("READY");
    expect(res.body.components.mongodb).toBe("CONNECTED");
  });

  it("GET /api/v1/executive/overview - OWNER should receive combined multi-business overview (Section 4 & 38)", async () => {
    const res = await request(app)
      .get("/api/v1/executive/overview")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalWorkforce).toBeGreaterThan(0);
    expect(res.body.data.activeSitesCount).toBeGreaterThan(0);
  });

  it("GET /api/v1/executive/business-performance - should report separate breakdown for both businesses (Section 4)", async () => {
    const res = await request(app)
      .get("/api/v1/executive/business-performance")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.map((b) => b.businessId)).toContain("pruthviraj-enterprises");
    expect(res.body.data.map((b) => b.businessId)).toContain("pruthviraj-facilities");
  });

  it("GET /api/v1/leaves/balances & POST /api/v1/leaves/apply - should manage leave quotas accurately", async () => {
    const emp = await User.findOne({ role: "EMPLOYEE" });
    // Clean up previous runs
    await LeaveApplication.deleteMany({ userId: emp._id });
    await LeaveBalance.deleteMany({ userId: emp._id });

    const empToken = jwt.sign(
      { id: emp._id, role: emp.role, businessIds: emp.businessIds },
      environment.JWT.ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    // 1. Get initial balance
    const balRes = await request(app)
      .get("/api/v1/leaves/balances")
      .set("Authorization", `Bearer ${empToken}`);

    expect(balRes.status).toBe(200);
    expect(balRes.body.data.casualRemaining).toBe(12);

    // 2. Apply for 2 days leave
    const applyRes = await request(app)
      .post("/api/v1/leaves/apply")
      .set("Authorization", `Bearer ${empToken}`)
      .send({
        leaveType: "CASUAL",
        startDate: "2026-11-01",
        endDate: "2026-11-02",
        reason: "Personal family function in Pune",
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.data.status).toBe("PENDING");
    expect(applyRes.body.data.totalDays).toBe(2);
  });
});
