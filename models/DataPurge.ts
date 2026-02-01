/**
 * Data Purge Model
 * Tracks data purging/retention activities based on processing register
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';
import { RegulationType } from '@/lib/regulations';

export interface IDataPurge extends Document {
  purgeId: string;
  processingActivityId: string; // Reference to DataProcessingRegister
  purgeType: 'SCHEDULED' | 'ON_DEMAND' | 'LEGAL_REQUIREMENT' | 'CONSENT_WITHDRAWAL' | 'RETENTION_EXPIRY';
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  
  // Data Details
  dataTypes: string[]; // e.g., ['PERSONAL', 'CONTACT', 'FINANCIAL']
  dataVolume: {
    estimatedRecords: number;
    estimatedSizeGB: number;
    actualRecords?: number;
    actualSizeGB?: number;
  };
  dataLocations: string[]; // Systems/databases where data is stored
  dataOwner: {
    name: string;
    email: string;
    department?: string;
    role?: string;
  };
  
  // Purge Details
  scheduledDate: Date;
  dueDate: Date;
  completedDate?: Date;
  purgeMethod: 'SOFT_DELETE' | 'HARD_DELETE' | 'ANONYMIZATION' | 'PSEUDONYMIZATION' | 'ARCHIVAL';
  retentionCriteria: string; // Description of retention criteria
  legalBasis: string; // Legal basis for retention/purge
  
  // Execution Details
  executionOwner?: string; // User responsible for execution
  executionNotes?: string;
  failureReason?: string;
  
  // Related Entities
  relatedConsents?: string[]; // Consent IDs if related to consent withdrawal
  relatedBreaches?: string[]; // Breach IDs if related to breach response
  
  regulationType: RegulationType;
  createdAt?: Date;
  updatedAt?: Date;
}

const DataOwnerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  department: String,
  role: String,
});

const DataPurgeSchema = new Schema<IDataPurge>(
  {
    purgeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    processingActivityId: {
      type: String,
      required: true,
      index: true,
    },
    purgeType: {
      type: String,
      enum: ['SCHEDULED', 'ON_DEMAND', 'LEGAL_REQUIREMENT', 'CONSENT_WITHDRAWAL', 'RETENTION_EXPIRY'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    dataTypes: {
      type: [String],
      required: true,
    },
    dataVolume: {
      estimatedRecords: { type: Number, required: true },
      estimatedSizeGB: { type: Number, required: true },
      actualRecords: Number,
      actualSizeGB: Number,
    },
    dataLocations: {
      type: [String],
      required: true,
    },
    dataOwner: {
      type: DataOwnerSchema,
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    completedDate: Date,
    purgeMethod: {
      type: String,
      enum: ['SOFT_DELETE', 'HARD_DELETE', 'ANONYMIZATION', 'PSEUDONYMIZATION', 'ARCHIVAL'],
      required: true,
    },
    retentionCriteria: {
      type: String,
      required: true,
    },
    legalBasis: {
      type: String,
      required: true,
    },
    executionOwner: String,
    executionNotes: String,
    failureReason: String,
    relatedConsents: [String],
    relatedBreaches: [String],
    regulationType: {
      type: String,
      enum: Object.values(RegulationType),
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

let DataPurge: Model<IDataPurge>;

if (isLocalStorage()) {
  DataPurge = new LocalModel<IDataPurge>('DataPurge') as any;
} else {
  DataPurge = mongoose.models.DataPurge || mongoose.model<IDataPurge>('DataPurge', DataPurgeSchema);
}

export default DataPurge;
