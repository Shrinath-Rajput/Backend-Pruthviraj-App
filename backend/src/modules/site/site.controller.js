import siteService from "./site.service.js";
import ApiResponse from "../../common/ApiResponse.js";

export class SiteController {
  // Sites
  async createSite(req, res, next) {
    try {
      const site = await siteService.createSite(req.body, req.allowedBusinessIds);
      return res.status(201).json(ApiResponse.created(site, "Site created successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getSites(req, res, next) {
    try {
      const result = await siteService.getSites({
        ...req.query,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.list(result.sites, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getSiteById(req, res, next) {
    try {
      const site = await siteService.getSiteById(req.params.id, req.allowedBusinessIds);
      return res.status(200).json(ApiResponse.success(site));
    } catch (error) {
      next(error);
    }
  }

  async updateSite(req, res, next) {
    try {
      const site = await siteService.updateSite(req.params.id, req.body, req.allowedBusinessIds);
      return res.status(200).json(ApiResponse.success(site, "Site updated successfully."));
    } catch (error) {
      next(error);
    }
  }

  // Clients
  async createClient(req, res, next) {
    try {
      const client = await siteService.createClient(req.body, req.allowedBusinessIds);
      return res.status(201).json(ApiResponse.created(client, "Client created successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getClients(req, res, next) {
    try {
      const result = await siteService.getClients({
        ...req.query,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.list(result.clients, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getClientById(req, res, next) {
    try {
      const client = await siteService.getClientById(req.params.id, req.allowedBusinessIds);
      return res.status(200).json(ApiResponse.success(client));
    } catch (error) {
      next(error);
    }
  }

  async updateClient(req, res, next) {
    try {
      const client = await siteService.updateClient(req.params.id, req.body, req.allowedBusinessIds);
      return res.status(200).json(ApiResponse.success(client, "Client updated successfully."));
    } catch (error) {
      next(error);
    }
  }

  // Purchase Orders
  async createPurchaseOrder(req, res, next) {
    try {
      const po = await siteService.createPurchaseOrder(req.body, req.file, req.allowedBusinessIds);
      return res.status(201).json(ApiResponse.created(po, "Purchase Order created."));
    } catch (error) {
      next(error);
    }
  }

  async getPurchaseOrders(req, res, next) {
    try {
      const result = await siteService.getPurchaseOrders({
        ...req.query,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.list(result.orders, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  // Workers
  async createWorker(req, res, next) {
    try {
      const worker = await siteService.createWorker(req.body, req.allowedBusinessIds);
      return res.status(201).json(ApiResponse.created(worker, "Worker registered successfully."));
    } catch (error) {
      next(error);
    }
  }

  async getWorkers(req, res, next) {
    try {
      const result = await siteService.getWorkers({
        ...req.query,
        allowedBusinessIds: req.allowedBusinessIds,
      });
      return res.status(200).json(ApiResponse.list(result.workers, result.pagination));
    } catch (error) {
      next(error);
    }
  }

  async getWorkerById(req, res, next) {
    try {
      const worker = await siteService.getWorkerById(req.params.id, req.allowedBusinessIds);
      return res.status(200).json(ApiResponse.success(worker));
    } catch (error) {
      next(error);
    }
  }

  async uploadWorkerDocument(req, res, next) {
    try {
      const worker = await siteService.uploadWorkerDocument(
        req.params.id,
        req.body,
        req.file,
        req.allowedBusinessIds
      );
      return res.status(200).json(ApiResponse.success(worker, "Document uploaded securely."));
    } catch (error) {
      next(error);
    }
  }
}

export default new SiteController();
