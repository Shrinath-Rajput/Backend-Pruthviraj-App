import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import app from "../../src/app.js";
import environment from "../../src/config/environment.js";
import { Upload } from "../../src/modules/upload/upload.model.js";
import uploadService from "../../src/modules/upload/upload.service.js";
import { UPLOAD_ROOT_DIR } from "../../src/config/storage.js";
import User from "../../src/modules/auth/user.model.js";

describe("Upload Folder & MongoDB Image Link Storage Integration Tests", () => {
  let authToken;
  let testUserId;
  const createdUploadIds = [];

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(environment.MONGODB_URI);
    }

    // Ensure test user exists
    let testUser = await User.findOne({ employeeCode: "TEST-UPLOAD-USER" });
    if (!testUser) {
      testUser = await User.create({
        phoneNumber: "+919876543210",
        fullName: "Upload Test User",
        employeeCode: "TEST-UPLOAD-USER",
        role: "OWNER",
        businessIds: ["pruthviraj-enterprises"],
      });
    }
    testUserId = testUser._id;

    authToken = jwt.sign(
      {
        id: testUser._id,
        role: testUser.role,
        businessIds: testUser.businessIds,
      },
      environment.JWT.ACCESS_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    // Clean up created records from MongoDB and disk
    for (const id of createdUploadIds) {
      try {
        await uploadService.deleteUpload(id, ["pruthviraj-enterprises", "general"]);
      } catch {}
    }
    await Upload.deleteMany({ _id: { $in: createdUploadIds } });
    await User.deleteOne({ employeeCode: "TEST-UPLOAD-USER" });
  });

  it("1. Should save image to local uploads folder and store image link in MongoDB", async () => {
    const fakeImageBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
    ]); // Minimal valid JPEG bytes

    const result = await uploadService.saveUpload({
      buffer: fakeImageBuffer,
      originalName: "test_selfie.jpg",
      mimeType: "image/jpeg",
      folder: "selfies",
      businessId: "pruthviraj-enterprises",
      uploadedBy: testUserId,
      entityType: "SELFIE",
    });

    createdUploadIds.push(result.upload._id);

    // Verify link format
    expect(result.url).toMatch(/^\/uploads\/selfies\/pruthviraj-enterprises\/.+\.jpg$/);

    // Verify physical file exists in upload folder
    const diskPath = path.join(UPLOAD_ROOT_DIR, result.upload.storageKey);
    expect(fs.existsSync(diskPath)).toBe(true);

    // Verify MongoDB document contains the image link and metadata
    const mongoDoc = await Upload.findById(result.upload._id);
    expect(mongoDoc).toBeDefined();
    expect(mongoDoc.url).toBe(result.url);
    expect(mongoDoc.folder).toBe("selfies");
    expect(mongoDoc.mimeType).toBe("image/jpeg");
    expect(mongoDoc.size).toBe(fakeImageBuffer.length);
  });

  it("2. Should serve image statically from Express via the stored URL", async () => {
    const sampleBuffer = Buffer.from("fake-png-image-content-for-testing");
    const result = await uploadService.saveUpload({
      buffer: sampleBuffer,
      originalName: "static_check.png",
      mimeType: "image/png",
      folder: "images",
      businessId: "pruthviraj-enterprises",
      uploadedBy: testUserId,
      entityType: "IMAGE",
    });

    createdUploadIds.push(result.upload._id);

    // Fetch via Express static route using the exact link saved in MongoDB
    const res = await request(app).get(result.url);
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe(sampleBuffer.toString());
  });

  it("3. POST /api/v1/uploads/image - should upload image, store in upload folder and save link in MongoDB", async () => {
    const imageContent = Buffer.from("sample-binary-jpeg-image-bytes");

    const res = await request(app)
      .post("/api/v1/uploads/image")
      .set("Authorization", `Bearer ${authToken}`)
      .field("folder", "workers")
      .field("businessId", "pruthviraj-enterprises")
      .attach("image", imageContent, "profile.jpg");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toBeDefined();
    expect(res.body.data.url).toMatch(/^\/uploads\/workers\/pruthviraj-enterprises\/.+\.jpg$/);

    const uploadRecord = res.body.data.upload;
    expect(uploadRecord).toBeDefined();
    createdUploadIds.push(uploadRecord._id);

    // Verify record in MongoDB
    const foundInDb = await Upload.findById(uploadRecord._id);
    expect(foundInDb).not.toBeNull();
    expect(foundInDb.url).toBe(res.body.data.url);
    expect(foundInDb.originalName).toBe("profile.jpg");
  });

  it("4. GET /api/v1/uploads - should list image links from MongoDB", async () => {
    const res = await request(app)
      .get("/api/v1/uploads")
      .set("Authorization", `Bearer ${authToken}`)
      .query({ businessId: "pruthviraj-enterprises" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.uploads)).toBe(true);
    expect(res.body.data.uploads.length).toBeGreaterThan(0);
    expect(res.body.data.uploads[0].url).toMatch(/^\/uploads\//);
  });

  it("5. GET /api/v1/uploads/:id - should retrieve image metadata from MongoDB", async () => {
    const uploadId = createdUploadIds[0];
    const res = await request(app)
      .get(`/api/v1/uploads/${uploadId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id.toString()).toBe(uploadId.toString());
    expect(res.body.data.url).toMatch(/^\/uploads\//);
  });

  it("6. DELETE /api/v1/uploads/:id - should delete file from upload folder and remove link from MongoDB", async () => {
    // Create temporary file to delete
    const tempBuffer = Buffer.from("temp-file-to-be-deleted");
    const result = await uploadService.saveUpload({
      buffer: tempBuffer,
      originalName: "to_delete.png",
      mimeType: "image/png",
      folder: "temp",
      businessId: "pruthviraj-enterprises",
    });

    const fileDiskPath = path.join(UPLOAD_ROOT_DIR, result.upload.storageKey);
    expect(fs.existsSync(fileDiskPath)).toBe(true);

    const res = await request(app)
      .delete(`/api/v1/uploads/${result.upload._id}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify deleted from disk
    expect(fs.existsSync(fileDiskPath)).toBe(false);

    // Verify deleted from MongoDB
    const deletedDbRecord = await Upload.findById(result.upload._id);
    expect(deletedDbRecord).toBeNull();
  });
});
