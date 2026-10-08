import { Site, SiteGovernance, Client, PurchaseOrder } from "./site.model.js";
import User from "../auth/user.model.js";
import ApiError from "../../common/ApiError.js";
import { redisService } from "../../config/redis.js";
import uploadService from "../upload/upload.service.js";

const SITE_CACHE_TTL = 86400; // 24 hours (Section 15)

export class SiteService {
  /**
   * Cache active site geofence details in Redis (Section 15)
   */
  async cacheSiteGeofence(site) {
    if (!site) return;
    const cacheKey = `site_geofence:${site._id}`;
    const cachePayload = {
      siteId: site._id.toString(),
      centroid: site.centroid,
      boundary: site.boundaryPolygon,
      radius: site.geofenceRadiusMeters,
      businessId: site.businessId,
      isActive: site.isActive,
    };
    await redisService.set(cacheKey, cachePayload, SITE_CACHE_TTL);
  }

  /**
   * Get cached site geofence or fallback to DB and re-cache
   */
  async getCachedSiteGeofence(siteId) {
    const cacheKey = `site_geofence:${siteId}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return typeof cached === "string" ? JSON.parse(cached) : cached;
    }

    const site = await Site.findById(siteId).lean();
    if (site) {
      await this.cacheSiteGeofence(site);
      return {
        siteId: site._id.toString(),
        centroid: site.centroid,
        boundary: site.boundaryPolygon,
        radius: site.geofenceRadiusMeters,
        businessId: site.businessId,
        isActive: site.isActive,
      };
    }
    return null;
  }

  /**
   * Invalidate site cache on configuration update (Section 15)
   */
  async invalidateSiteCache(siteId) {
    await redisService.del(`site_geofence:${siteId}`);
  }

  /**
   * Create new Site with initial Site Governance binding
   */
  async createSite(siteData, allowedBusinessIds) {
    if (!allowedBusinessIds.includes(siteData.businessId)) {
      throw ApiError.forbidden(`Unauthorized to create site for business '${siteData.businessId}'.`);
    }

    const existing = await Site.findOne({ siteCode: siteData.siteCode.toUpperCase() });
    if (existing) {
      throw ApiError.conflict(`Site with code '${siteData.siteCode}' already exists.`);
    }

    const site = await Site.create({
      ...siteData,
      siteCode: siteData.siteCode.toUpperCase(),
    });

    // Cache immediately (Section 15)
    await this.cacheSiteGeofence(site);

    // If supervisor provided, create 1-to-1 site governance invariant (Section 16)
    if (siteData.primarySupervisorId) {
      await SiteGovernance.create({
        siteId: site._id,
        businessId: site.businessId,
        primarySupervisorId: siteData.primarySupervisorId,
        governanceStatus: "ACTIVE_ON_DUTY",
      });
    }

    return site;
  }

  /**
   * List sites with business isolation filter and pagination
   */
  async getSites({ businessId, region, search, page = 1, limit = 20, allowedBusinessIds }) {
    const query = {
      businessId: { $in: allowedBusinessIds },
    };

    if (businessId && allowedBusinessIds.includes(businessId)) {
      query.businessId = businessId;
    }
    if (region) query.region = region;
    if (search) {
      query.$or = [
        { siteName: { $regex: search, $options: "i" } },
        { siteCode: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [sites, total] = await Promise.all([
      Site.find(query).populate("clientId", "clientName clientCode").skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Site.countDocuments(query),
    ]);

    return {
      sites,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSiteById(siteId, allowedBusinessIds) {
    const site = await Site.findById(siteId).populate("clientId");
    if (!site) throw ApiError.notFound("Site not found.");
    if (!allowedBusinessIds.includes(site.businessId)) {
      throw ApiError.forbidden("Access to site in unauthorized business denied.");
    }
    return site;
  }

  async updateSite(siteId, updateData, allowedBusinessIds) {
    const site = await Site.findById(siteId);
    if (!site) throw ApiError.notFound("Site not found.");
    if (!allowedBusinessIds.includes(site.businessId)) {
      throw ApiError.forbidden("Access denied to update site.");
    }

    Object.assign(site, updateData);
    await site.save();

    // Invalidate Redis cache (Section 15)
    await this.invalidateSiteCache(siteId);
    await this.cacheSiteGeofence(site);

    return site;
  }

  // ================= CLIENT MANAGEMENT (Section 30) =================
  async createClient(clientData, allowedBusinessIds) {
    if (!allowedBusinessIds.includes(clientData.businessId)) {
      throw ApiError.forbidden("Unauthorized business scope for client creation.");
    }

    const existing = await Client.findOne({ clientCode: clientData.clientCode.toUpperCase() });
    if (existing) throw ApiError.conflict(`Client code '${clientData.clientCode}' already exists.`);

    return await Client.create({
      ...clientData,
      clientCode: clientData.clientCode.toUpperCase(),
    });
  }

  async getClients({ businessId, search, page = 1, limit = 20, allowedBusinessIds }) {
    const query = { businessId: { $in: allowedBusinessIds } };
    if (businessId && allowedBusinessIds.includes(businessId)) {
      query.businessId = businessId;
    }
    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: "i" } },
        { clientCode: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [clients, total] = await Promise.all([
      Client.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Client.countDocuments(query),
    ]);

    return {
      clients,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getClientById(clientId, allowedBusinessIds) {
    const client = await Client.findById(clientId);
    if (!client) throw ApiError.notFound("Client not found.");
    if (!allowedBusinessIds.includes(client.businessId)) {
      throw ApiError.forbidden("Access denied to client outside authorized business.");
    }
    return client;
  }

  async updateClient(clientId, updateData, allowedBusinessIds) {
    const client = await Client.findById(clientId);
    if (!client) throw ApiError.notFound("Client not found.");
    if (!allowedBusinessIds.includes(client.businessId)) {
      throw ApiError.forbidden("Access denied to client.");
    }

    Object.assign(client, updateData);
    await client.save();
    return client;
  }

  // ================= PURCHASE ORDERS (Section 33) =================
  async createPurchaseOrder(poData, file, allowedBusinessIds) {
    if (!allowedBusinessIds.includes(poData.businessId)) {
      throw ApiError.forbidden("Unauthorized business scope for PO creation.");
    }

    let documentUrl = null;
    if (file) {
      const savedDoc = await uploadService.saveUpload({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        folder: "purchase_orders",
        businessId: poData.businessId,
        entityType: "PURCHASE_ORDER",
      });
      documentUrl = savedDoc.url;
    }

    return await PurchaseOrder.create({
      ...poData,
      documentUrl,
    });
  }

  async getPurchaseOrders({ businessId, clientId, siteId, page = 1, limit = 20, allowedBusinessIds }) {
    const query = { businessId: { $in: allowedBusinessIds } };
    if (businessId && allowedBusinessIds.includes(businessId)) query.businessId = businessId;
    if (clientId) query.clientId = clientId;
    if (siteId) query.siteId = siteId;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query).populate("clientId siteId").skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      PurchaseOrder.countDocuments(query),
    ]);

    return {
      orders,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ================= WORKERS (Section 31 & 32) =================
  async createWorker(workerData, allowedBusinessIds) {
    const businessId = workerData.businessIds?.[0] || "pruthviraj-enterprises";
    if (!allowedBusinessIds.includes(businessId)) {
      throw ApiError.forbidden("Unauthorized business for worker creation.");
    }

    const existingCode = await User.findOne({ employeeCode: workerData.employeeCode.toUpperCase() });
    if (existingCode) throw ApiError.conflict(`Employee code '${workerData.employeeCode}' already exists.`);

    const existingPhone = await User.findOne({ phoneNumber: workerData.phoneNumber });
    if (existingPhone) throw ApiError.conflict(`Worker phone '${workerData.phoneNumber}' already exists.`);

    return await User.create({
      ...workerData,
      role: workerData.role || "EMPLOYEE",
      employeeCode: workerData.employeeCode.toUpperCase(),
    });
  }

  async getWorkers({ businessId, siteId, search, page = 1, limit = 20, allowedBusinessIds }) {
    const query = {
      businessIds: { $in: allowedBusinessIds },
      role: { $in: ["EMPLOYEE", "STAFF", "SUPERVISOR"] },
    };

    if (businessId && allowedBusinessIds.includes(businessId)) {
      query.businessIds = businessId;
    }
    if (siteId) query.assignedSiteId = siteId;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [workers, total] = await Promise.all([
      User.find(query).populate("assignedSiteId", "siteName siteCode").skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    return {
      workers,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getWorkerById(workerId, allowedBusinessIds) {
    const worker = await User.findById(workerId).populate("assignedSiteId assignedSupervisorId");
    if (!worker) throw ApiError.notFound("Worker not found.");
    const hasAccess = worker.businessIds.some((b) => allowedBusinessIds.includes(b));
    if (!hasAccess) throw ApiError.forbidden("Access denied to worker from unauthorized business.");
    return worker;
  }

  async uploadWorkerDocument(workerId, { documentType, maskedNumber }, file, allowedBusinessIds) {
    const worker = await this.getWorkerById(workerId, allowedBusinessIds);
    if (!file) throw ApiError.badRequest("Document file buffer required.");

    const savedDoc = await uploadService.saveUpload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: "worker_docs",
      businessId: worker.businessIds[0] || "general",
      uploadedBy: worker._id,
      entityType: "WORKER_DOC",
    });
    const fileUrl = savedDoc.url;

    worker.documents.push({
      documentType,
      maskedNumber: maskedNumber || "••••" + file.originalname.slice(-4),
      fileUrl,
      verified: true,
    });

    await worker.save();
    return worker;
  }
}

export default new SiteService();
