/**
 * Data Governance Model
 * Manages data ownership, stewardship, and custodianship
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';
import { RegulationType } from '@/lib/regulations';

export interface IDataGovernance extends Document {
  governanceId: string;
  businessProcess: string;
  businessProcessDescription?: string;
  dataOwner: {
    name: string;
    email: string;
    department: string;
    role: string;
  };
  dataSteward: {
    name: string;
    email: string;
    department: string;
    role: string;
  };
  dataCustodian: {
    name: string;
    email: string;
    department: string;
    role: string;
  };
  conceptualDataTypes: string[]; // e.g., "Customer Data", "Financial Data", "Employee Data"
  keySystems: string[]; // e.g., "CRM System", "ERP System", "HR System"
  dataCategories: string[]; // Specific data categories processed
  processingActivities: string[]; // References to DataProcessingRegister activityIds
  relatedRequirements?: string[]; // Legal requirement IDs
  relatedControls?: string[]; // Control IDs
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  notes?: string;
  regulationType: RegulationType;
  createdAt?: Date;
  updatedAt?: Date;
}

const DataGovernanceSchema = new Schema<IDataGovernance>(
  {
    governanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    businessProcess: {
      type: String,
      required: true,
    },
    businessProcessDescription: String,
    dataOwner: {
      name: { type: String, required: true },
      email: { type: String, required: true, index: true },
      department: { type: String, required: true },
      role: { type: String, required: true },
    },
    dataSteward: {
      name: { type: String, required: true },
      email: { type: String, required: true, index: true },
      department: { type: String, required: true },
      role: { type: String, required: true },
    },
    dataCustodian: {
      name: { type: String, required: true },
      email: { type: String, required: true, index: true },
      department: { type: String, required: true },
      role: { type: String, required: true },
    },
    conceptualDataTypes: {
      type: [String],
      required: true,
    },
    keySystems: {
      type: [String],
      required: true,
    },
    dataCategories: [String],
    processingActivities: [String],
    relatedRequirements: [String],
    relatedControls: [String],
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'INACTIVE', 'UNDER_REVIEW'],
      default: 'ACTIVE',
      index: true,
    },
    lastReviewDate: Date,
    nextReviewDate: Date,
    notes: String,
    regulationType: {
      type: String,
      enum: Object.values(RegulationType),
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'datagovernance',
  }
);

DataGovernanceSchema.index({ regulationType: 1, status: 1 });

let DataGovernance: Model<IDataGovernance>;

if (isLocalStorage()) {
  DataGovernance = new LocalModel<IDataGovernance>('DataGovernance') as any;
} else {
  DataGovernance = mongoose.models.DataGovernance || mongoose.model<IDataGovernance>('DataGovernance', DataGovernanceSchema);
}

export default DataGovernance;
