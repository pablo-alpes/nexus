import mongoose, { Schema, Document } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export enum DORAPillar {
  ICT_RISK_MANAGEMENT = 'ICT_RISK_MANAGEMENT',
  INCIDENT_MANAGEMENT = 'INCIDENT_MANAGEMENT',
  RESILIENCE_TESTING = 'RESILIENCE_TESTING',
  THIRD_PARTY_RISK = 'THIRD_PARTY_RISK',
  INFORMATION_SHARING = 'INFORMATION_SHARING',
}

export enum ComplianceStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  FULLY_COMPLIANT = 'FULLY_COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  NOT_COMPLIANT = 'NOT_COMPLIANT',
}

export interface IDORARequirement extends Document {
  requirementId: string;
  chapter?: string;
  article?: string;
  paragraph?: string;
  title: string;
  description: string;
  legalText: string;
  pillar: DORAPillar;
  applicableTo?: string[];
  complianceStatus?: ComplianceStatus;
  notes?: string;
  iso27001Mappings?: Array<{
    control: string;
    title: string;
    description: string;
    relevance: 'High' | 'Medium' | 'Low';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DORARequirementSchema = new Schema<IDORARequirement>(
  {
    requirementId: {
      type: String,
      required: true,
      unique: true,
    },
    chapter: {
      type: String,
    },
    article: {
      type: String,
    },
    paragraph: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    legalText: {
      type: String,
      required: true,
    },
    pillar: {
      type: String,
      enum: Object.values(DORAPillar),
      required: true,
    },
    applicableTo: {
      type: [String],
    },
    complianceStatus: {
      type: String,
      enum: Object.values(ComplianceStatus),
      default: ComplianceStatus.NOT_APPLICABLE,
    },
    notes: {
      type: String,
    },
    iso27001Mappings: [{
      control: String,
      title: String,
      description: String,
      relevance: { type: String, enum: ['High', 'Medium', 'Low'] },
    }],
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let DORARequirementModel: any;

if (isLocalStorage()) {
  DORARequirementModel = new LocalModel<IDORARequirement>('DORARequirement');
} else {
  DORARequirementModel = mongoose.models.DORARequirement || 
    mongoose.model<IDORARequirement>('DORARequirement', DORARequirementSchema);
}

export default DORARequirementModel;
