import mongoose from "mongoose";

const siteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Site name is required"],
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: [true, "Site code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "India" },
    },
    // GeoJSON Point for 2dsphere spatial queries (coordinates: [longitude, latitude])
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    radiusMeters: {
      type: Number,
      required: true,
      default: 150, // 150 meters circular geofence boundary
      min: [10, "Minimum geofence radius is 10 meters"],
      max: [50000, "Maximum geofence radius is 50 kilometers"],
    },
    geofenceType: {
      type: String,
      enum: ["RADIUS", "POLYGON"],
      default: "RADIUS",
    },
    polygonBoundary: {
      type: {
        type: String,
        enum: ["Polygon"],
      },
      coordinates: {
        type: [[[Number]]], // Array of linear rings: [[[lon, lat], [lon, lat], ...]]
      },
    },
    assignedSupervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    workingHours: {
      startTime: { type: String, default: "09:00" }, // "HH:MM"
      endTime: { type: String, default: "18:00" },
      gracePeriodMinutes: { type: Number, default: 15 },
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

// 2dsphere index for MongoDB spatial queries ($near, $geoWithin)
siteSchema.index({ location: "2dsphere" });

export const Site = mongoose.model("Site", siteSchema);
export default Site;
