import siteService from "./site.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class SiteController {
  async createSite(req, res, next) {
    try {
      const site = await siteService.createSite(req.body);
      return res
        .status(201)
        .json(ApiResponse.created(site, "Site created successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getSites(req, res, next) {
    try {
      const result = await siteService.getSites(req.query);
      return res
        .status(200)
        .json(ApiResponse.success(result, "Sites retrieved successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getSiteById(req, res, next) {
    try {
      const site = await siteService.getSiteById(req.params.id);
      return res
        .status(200)
        .json(ApiResponse.success(site, "Site retrieved successfully."));
    } catch (error) {
      next(error);
    }
  }

  async updateSite(req, res, next) {
    try {
      const updated = await siteService.updateSite(req.params.id, req.body);
      return res
        .status(200)
        .json(ApiResponse.success(updated, "Site updated successfully."));
    } catch (error) {
      next(error);
    }
  }

  async deleteSite(req, res, next) {
    try {
      const result = await siteService.deleteSite(req.params.id);
      return res
        .status(200)
        .json(ApiResponse.success(result, "Site deleted successfully."));
    } catch (error) {
      next(error);
    }
  }

  async findNearbySites(req, res, next) {
    try {
      const { latitude, longitude, maxDistance } = req.query;
      const sites = await siteService.findSitesNearLocation(
        parseFloat(latitude),
        parseFloat(longitude),
        maxDistance ? parseFloat(maxDistance) : 5000
      );
      return res
        .status(200)
        .json(ApiResponse.success(sites, "Nearby sites found."));
    } catch (error) {
      next(error);
    }
  }

  async verifyGeofence(req, res, next) {
    try {
      const { siteId } = req.params;
      const { latitude, longitude } = req.body;
      const result = await siteService.verifyGeofence(
        siteId,
        parseFloat(latitude),
        parseFloat(longitude)
      );
      return res
        .status(200)
        .json(ApiResponse.success(result, "Geofence verification complete."));
    } catch (error) {
      next(error);
    }
  }
}

export default new SiteController();
