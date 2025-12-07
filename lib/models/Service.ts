import mongoose, { Schema, Document, Model } from "mongoose";

export interface IServiceDetails {
  detailsHTML?: string;
  fullDescription?: string;
  eligibility?: string;
  fees?: string;
  languages?: string;
  hoursOfOperation?: string;
  accessibility?: string;
  applicationProcess?: string;
  serviceAreas?: string;
}

export interface IService extends Document {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  address: string;
  website: string;
  subtopicIds: string[];
  locations: string[];
  details?: IServiceDetails;
  embedding?: number[]; // Vector embedding for semantic search
  embeddingModel?: string; // Model used to generate the embedding
  createdAt: Date;
  updatedAt: Date;
}

const ServiceDetailsSchema = new Schema<IServiceDetails>(
  {
    detailsHTML: { type: String },
    fullDescription: { type: String },
    eligibility: { type: String },
    fees: { type: String },
    languages: { type: String },
    hoursOfOperation: { type: String },
    accessibility: { type: String },
    applicationProcess: { type: String },
    serviceAreas: { type: String },
  },
  { _id: false }
);

const ServiceSchema = new Schema<IService>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    subtitle: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    subtopicIds: {
      type: [String],
      default: [],
      index: true,
    },
    locations: {
      type: [String],
      required: true,
      index: true,
    },
    details: {
      type: ServiceDetailsSchema,
      default: {},
    },
    embedding: {
      type: [Number],
      required: false,
    },
    embeddingModel: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "services",
  }
);

// Create indexes for better query performance
ServiceSchema.index({ name: "text", subtitle: "text", description: "text" });
ServiceSchema.index({ locations: 1, name: 1 });

// Prevent model recompilation in development
const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", ServiceSchema);

export default Service;
