import mongoose, { Schema, Document, Types } from 'mongoose';
import { DORAPillar } from './DORARequirement';
import { useLocalStorage } from '@/lib/local-storage';
import { LocalModel } from './LocalModel';

export enum ControlType {
  TRANSVERSAL = 'TRANSVERSAL', // Applies to all assets
  SPECIFIC = 'SPECIFIC', // Applies to specific asset types
}

export enum ControlStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  PARTIALLY_IMPLEMENTED = 'PARTIALLY_IMPLEMENTED',
  FULLY_IMPLEMENTED = 'FULLY_IMPLEMENTED',
}

export enum ComplianceStatus {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  FULLY_COMPLIANT = 'FULLY_COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  NOT_COMPLIANT = 'NOT_COMPLIANT',
}

export interface ISO27001Mapping {
  control: string; // e.g., "A.5.1.1"
  title: string;
  description: string;
  relevance: 'High' | 'Medium' | 'Low';
}

export interface IControl extends Document {
  controlId: string;
  title: string;
  description: string;
  pillar: DORAPillar;
  requirementIds: Types.ObjectId[]; // References to DORA Requirements
  controlType: ControlType;
  applicableAssetTypes?: string[]; // For SPECIFIC controls
  minCriticalityLevel?: number; // Minimum criticality level (1-4) for this control
  questions: Types.ObjectId[]; // References to Questionnaire Questions
  status?: ControlStatus;
  complianceStatus?: ComplianceStatus; // User-defined compliance status
  iso27001Mappings?: ISO27001Mapping[]; // ISO 27001 control mappings
  notes?: string; // User notes about compliance
  createdAt: Date;
  updatedAt: Date;
}

const ControlSchema = new Schema<IControl>(
  {
    controlId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    pillar: {
      type: String,
      enum: Object.values(DORAPillar),
      required: true,
    },
    requirementIds: [{
      type: Schema.Types.ObjectId,
      ref: 'DORARequirement',
    }],
    controlType: {
      type: String,
      enum: Object.values(ControlType),
      required: true,
    },
    applicableAssetTypes: {
      type: [String],
    },
    minCriticalityLevel: {
      type: Number,
      min: 1,
      max: 4,
    },
    questions: [{
      type: Schema.Types.ObjectId,
      ref: 'Question',
    }],
    status: {
      type: String,
      enum: Object.values(ControlStatus),
      default: ControlStatus.NOT_APPLICABLE,
    },
    complianceStatus: {
      type: String,
      enum: Object.values(ComplianceStatus),
      default: ComplianceStatus.NOT_APPLICABLE,
    },
    iso27001Mappings: [{
      control: String,
      title: String,
      description: String,
      relevance: { type: String, enum: ['High', 'Medium', 'Low'] },
    }],
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let ControlModel: any;

if (useLocalStorage()) {
  ControlModel = new LocalModel<IControl>('Control');
} else {
  ControlModel = mongoose.models.Control || mongoose.model<IControl>('Control', ControlSchema);
}

export default ControlModel;

