import mongoose from "mongoose";

/**
 * 1. Site Model (Section 12)
 */
const siteSchema = new mongoose.Schema(
  {
    siteCode: {
      type: String,
      required: [true, "Site code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    siteName: {
      type: String,
      required: [true, "Site name is required"],
      trim: true,
      maxlength: 150,
    },
    businessId: {
      type: String,
      required: [true, "Business ID is required"],
      index: true,
      enum: ["pruthviraj-enterprises", "pruthviraj-facilities"],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
      index: true,
    },
    locationCode: {
      type: String,
      default: "",
      trim: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // GeoJSON Centroid Point (Coordinates: [longitude, latitude])
    centroid: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [lon, lat]
        required: true,
      },
    },
    // Optional GeoJSON Multi-Point Boundary Polygon
    boundaryPolygon: {
      type: {
        type: String,
        enum: ["Polygon"],
      },
      coordinates: {
        type: [[[Number]]], // Linear rings of [lon, lat]
      },
    },
    geofenceRadiusMeters: {
      type: Number,
      required: true,
      default: 50.0,
      min: [5, "Minimum radius is 5 meters"],
      max: [50000, "Maximum radius is 50,000 meters"],
    },
    polygonId: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere indexes for proximity ($near) and polygon boundary containment ($geoIntersects)
siteSchema.index({ centroid: "2dsphere" });
siteSchema.index({ boundaryPolygon: "2dsphere" }, { sparse: true });
siteSchema.index({ businessId: 1, isActive: 1 });

export const Site = mongoose.model("Site", siteSchema);

/**
 * 2. Site Governance Model (1 Site = 1 Primary Supervisor Invariant) (Section 16)
 */
const siteGovernanceSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      unique: true, // Invariant: exactly 1 governance doc per site
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    primarySupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    governanceStatus: {
      type: String,
      enum: ["ACTIVE_ON_DUTY", "HANDOVER_PENDING", "VACANT_ALERT"],
      default: "ACTIVE_ON_DUTY",
      index: true,
    },
    handoverSupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    handoverInitiatedAt: {
      type: Date,
      default: null,
    },
    activeWorkersCount: {
      type: Number,
      default: 0,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
      index: true,
    },
    activeShiftName: {
      type: String,
      default: "Day Shift (08:00 - 17:00)",
    },
  },
  {
    timestamps: true,
  }
);

export const SiteGovernance = mongoose.model("SiteGovernance", siteGovernanceSchema);

/**
 * 3. Client Model (Section 30)
 */
const clientSchema = new mongoose.Schema(
  {
    clientCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    businessId: {
      type: String,
      required: true,
      enum: ["pruthviraj-enterprises", "pruthviraj-facilities"],
      index: true,
    },
    contactPerson: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    gstNumber: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },
    billingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "Maharashtra" },
      postalCode: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Client = mongoose.model("Client", clientSchema);

/**
 * 4. Purchase Order Model (Section 33)
 */
const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
      index: true,
    },
    contractValuePaise: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    documentUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "EXPIRED", "TERMINATED"],
      default: "ACTIVE",
      index: true,
    },
    assignedWorkersCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

export default {
  Site,
  SiteGovernance,
  Client,
  PurchaseOrder,
};
