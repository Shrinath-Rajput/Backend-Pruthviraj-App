import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import environment from "../../src/config/environment.js";
import User from "../../src/modules/auth/user.model.js";
import { Site } from "../../src/modules/site/site.model.js";

describe("Critical Enterprise Security Tests (Section 63)", () => {
  let employeeTokenBusinessA;
  let employeeTokenBusinessB;
  let supervisorToken;
  let siteA;
  let siteB;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(environment.MONGODB_URI);
    }

    // 1. Create Site in Business A
    siteA = await Site.findOneAndUpdate(
      { siteCode: "TEST-SITE-A" },
      {
        siteCode: "TEST-SITE-A",
        siteName: "Assembly Plant A",
        businessId: "pruthviraj-enterprises",
        region: "Pune Zone",
        centroid: { type: "Point", coordinates: [73.856, 18.52] },
        geofenceRadiusMeters: 50.0,
      },
      { upsert: true, new: true }
    );

    // 2. Create Site in Business B
    siteB = await Site.findOneAndUpdate(
      { siteCode: "TEST-SITE-B" },
      {
        siteCode: "TEST-SITE-B",
        siteName: "Facility Plant B",
        businessId: "pruthviraj-facilities",
        region: "Mumbai Zone",
        centroid: { type: "Point", coordinates: [72.877, 19.076] },
        geofenceRadiusMeters: 50.0,
      },
      { upsert: true, new: true }
    );

    // 3. User in Business A
    const userA = await User.findOneAndUpdate(
      { phoneNumber: "+919999000001" },
      {
        phoneNumber: "+919999000001",
        fullName: "Worker A",
        employeeCode: "EMP-A-01",
        role: "EMPLOYEE",
        businessIds: ["pruthviraj-enterprises"],
        assignedSiteId: siteA._id,
      },
      { upsert: true, new: true }
    );

    // 4. User in Business B
    const userB = await User.findOneAndUpdate(
      { phoneNumber: "+919999000002" },
      {
        phoneNumber: "+919999000002",
        fullName: "Worker B",
        employeeCode: "EMP-B-01",
        role: "EMPLOYEE",
        businessIds: ["pruthviraj-facilities"],
        assignedSiteId: siteB._id,
      },
      { upsert: true, new: true }
    );

    // 5. Supervisor in Business A
    const supA = await User.findOneAndUpdate(
      { phoneNumber: "+919999000003" },
      {
        phoneNumber: "+919999000003",
        fullName: "Supervisor A",
        employeeCode: "SUP-A-01",
        role: "SUPERVISOR",
        businessIds: ["pruthviraj-enterprises"],
        assignedSiteId: siteA._id,
      },
      { upsert: true, new: true }
    );

    employeeTokenBusinessA = jwt.sign(
      { id: userA._id, role: userA.role, businessIds: userA.businessIds },
      environment.JWT.ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    employeeTokenBusinessB = jwt.sign(
      { id: userB._id, role: userB.role, businessIds: userB.businessIds },
      environment.JWT.ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    supervisorToken = jwt.sign(
      { id: supA._id, role: supA.role, businessIds: supA.businessIds },
      environment.JWT.ACCESS_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ phoneNumber: { $in: ["+919999000001", "+919999000002", "+919999000003"] } });
    await Site.deleteMany({ siteCode: { $in: ["TEST-SITE-A", "TEST-SITE-B"] } });
  });

  it("Security Test 1: User from Business A CANNOT access Business B data (Section 10 & 63)", async () => {
    const res = await request(app)
      .get(`/api/v1/sites/${siteB._id}`)
      .set("Authorization", `Bearer ${employeeTokenBusinessA}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("Security Test 2: Employee role CANNOT access Executive endpoints (Section 8 & 63)", async () => {
    const res = await request(app)
      .get("/api/v1/executive/overview")
      .set("Authorization", `Bearer ${employeeTokenBusinessA}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("FORBIDDEN");
  });

  it("Security Test 3: Employee role CANNOT approve payroll runs (Section 27 & 63)", async () => {
    const res = await request(app)
      .post("/api/v1/payroll/approve")
      .set("Authorization", `Bearer ${employeeTokenBusinessA}`)
      .send({ runId: "650000000000000000000001" });

    expect(res.status).toBe(403);
  });

  it("Security Test 4: Invalid or forged JWT is rejected with 401 Unauthorized (Section 63)", async () => {
    const forgedToken = jwt.sign({ id: "hacker" }, "wrong_secret_key_1234");
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
  });

  it("Security Test 5: Out-of-geofence punch is BLOCKED and returns 422 GEOFENCE_PERIMETER_BREACH (Section 13, 19 & 63)", async () => {
    const res = await request(app)
      .post("/api/v1/attendance/punch")
      .set("Authorization", `Bearer ${employeeTokenBusinessA}`)
      .send({
        punchType: "CHECK_IN",
        latitude: 18.99, // ~50 km away from siteA (18.52)
        longitude: 73.856,
        accuracy: 5.0,
        siteId: siteA._id.toString(),
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("GEOFENCE_PERIMETER_BREACH");
    expect(res.body.details.distanceMeters).toBeGreaterThan(50);
  });

  it("Security Test 6: Inaccurate GPS reading (> 20m) is rejected (Section 13 & 63)", async () => {
    const res = await request(app)
      .post("/api/v1/attendance/punch")
      .set("Authorization", `Bearer ${employeeTokenBusinessA}`)
      .send({
        punchType: "CHECK_IN",
        latitude: 18.52,
        longitude: 73.856,
        accuracy: 45.0, // GPS accuracy degraded to 45m (> 20m threshold)
        siteId: siteA._id.toString(),
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
