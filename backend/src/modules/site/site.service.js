import Site from "./site.model.js";
import ApiError from "../../common/ApiError.js";
import {
  toGeoJSONPoint,
  calculateDistanceMeters,
  isPointInPolygon,
} from "../../common/utils/geoSpatial.js";

export class SiteService {
  /**
   * Create a new work site with geofence
   */
  async createSite(siteData) {
    const existing = await Site.findOne({ code: siteData.code.toUpperCase() });
    if (existing) {
      throw ApiError.conflict(`Site with code '${siteData.code}' already exists.`);
    }

    const location = toGeoJSONPoint(siteData.latitude, siteData.longitude);

    const site = await Site.create({
      ...siteData,
      code: siteData.code.toUpperCase(),
      location,
    });

    return site;
  }

  /**
   * List sites with pagination & filtering
   */
  async getSites({ page = 1, limit = 20, search, isActive }) {
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [sites, total] = await Promise.all([
      Site.find(query)
        .populate("assignedSupervisorId", "name email phone employeeCode")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Site.countDocuments(query),
    ]);

    return {
      sites,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single site by ID
   */
  async getSiteById(id) {
    const site = await Site.findById(id).populate("assignedSupervisorId", "name email phone employeeCode");
    if (!site) {
      throw ApiError.notFound("Site not found.");
    }
    return site;
  }

  /**
   * Update site details or geofence boundary
   */
  async updateSite(id, updateData) {
    const site = await Site.findById(id);
    if (!site) {
      throw ApiError.notFound("Site not found.");
    }

    if (updateData.latitude !== undefined && updateData.longitude !== undefined) {
      updateData.location = toGeoJSONPoint(updateData.latitude, updateData.longitude);
      delete updateData.latitude;
      delete updateData.longitude;
    }

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
      const existing = await Site.findOne({ code: updateData.code, _id: { $ne: id } });
      if (existing) {
        throw ApiError.conflict(`Site code '${updateData.code}' is already taken.`);
      }
    }

    const updatedSite = await Site.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    return updatedSite;
  }

  /**
   * Delete or deactivate site
   */
  async deleteSite(id) {
    const site = await Site.findById(id);
    if (!site) {
      throw ApiError.notFound("Site not found.");
    }
    await Site.findByIdAndDelete(id);
    return { message: "Site deleted successfully." };
  }

  /**
   * Find sites near a given GPS coordinate using MongoDB 2dsphere $near
   */
  async findSitesNearLocation(latitude, longitude, maxDistanceMeters = 5000) {
    const sites = await Site.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: Number(maxDistanceMeters),
        },
      },
    }).limit(10);

    return sites;
  }

  /**
   * Verify whether a given GPS coordinate is within site geofence
   */
  async verifyGeofence(siteId, latitude, longitude) {
    const site = await Site.findById(siteId);
    if (!site) {
      throw ApiError.notFound("Target site not found.");
    }

    const [siteLon, siteLat] = site.location.coordinates;
    const distanceMeters = calculateDistanceMeters(latitude, longitude, siteLat, siteLon);

    let isInside = false;

    if (site.geofenceType === "POLYGON" && site.polygonBoundary?.coordinates?.length) {
      isInside = isPointInPolygon([longitude, latitude], site.polygonBoundary.coordinates[0]);
    } else {
      isInside = distanceMeters <= site.radiusMeters;
    }

    return {
      siteId: site._id,
      siteName: site.name,
      siteRadiusMeters: site.radiusMeters,
      distanceMeters,
      isInside,
      geofenceType: site.geofenceType,
    };
  }
}

export default new SiteService();
