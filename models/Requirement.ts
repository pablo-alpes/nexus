/**
 * Generic Requirement Model
 * Supports multiple regulations (DORA, Chilean Privacy, etc.)
 */

import mongoose, { Schema, Document } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';
import { RegulationType } from '@/lib/regulations';

export enum ComplianceStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  FULLY_COMPLIANT = 'FULLY_COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  NOT_COMPLIANT = 'NOT_COMPLIANT',
}

export interface IRequirement extends Document {
  requirementId: string;
  regulationType: RegulationType;
  chapter?: string;
  article?: string;
  paragraph?: string;
  title: string;
  description: string;
  legalText: string;
  pillar: string; // Regulation-specific pillar ID
  applicableTo?: string[];
  complianceStatus?: ComplianceStatus;
  notes?: string;
  iso27001Mappings?: Array<{
    control: string;
    title: string;
    description: string;
    relevance: 'High' | 'Medium' | 'Low';
  }>;
  iso27701Mappings?: Array<{
    control: string;
    title: string;
    description: string;
    relevance: 'High' | 'Medium' | 'Low';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const RequirementSchema = new Schema<IRequirement>(
  {
    requirementId: {
      type: String,
      required: true,
      unique: true,
    },
    regulationType: {
      type: String,
      enum: Object.values(RegulationType),
      required: true,
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
    iso27701Mappings: [{
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

// Create compound index for regulation + requirementId
RequirementSchema.index({ regulationType: 1, requirementId: 1 }, { unique: true });

// Export model with local storage fallback
let RequirementModel: any;

if (isLocalStorage()) {
  RequirementModel = new LocalModel<IRequirement>('Requirement');
} else {
  RequirementModel = mongoose.models.Requirement || 
    mongoose.model<IRequirement>('Requirement', RequirementSchema);
}

export default RequirementModel;
