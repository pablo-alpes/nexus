/**
 * DataProcessingRegister Model
 * Records of Processing Activities (ROPA) - Article 30 GDPR equivalent
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IDataProcessingRegister extends Document {
  activityId: string;
  activityName: string;
  description: string;
  purpose: string;
  legalBasis: 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION' | 'VITAL_INTERESTS' | 'PUBLIC_TASK' | 'LEGITIMATE_INTERESTS';
  dataCategories: string[]; // e.g., ['Name', 'Email', 'Phone', 'Address']
  dataSubjectCategories: string[]; // e.g., ['Customers', 'Employees', 'Suppliers']
  recipients?: string[]; // Third parties who receive the data
  thirdCountryTransfers?: Array<{
    country: string;
    safeguard: string; // e.g., 'Standard Contractual Clauses', 'Adequacy Decision'
  }>;
  retentionPeriod: string; // e.g., '5 years', 'Until consent withdrawal'
  securityMeasures: string[];
  securityMeasuresDetails?: {
    encryption?: string; // Encryption type and status
    accessControls?: string; // Access control mechanisms
    authentication?: string; // Authentication methods
    networkSecurity?: string; // Network security measures
    physicalSecurity?: string; // Physical security measures
    backupRecovery?: string; // Backup and recovery procedures
    monitoring?: string; // Monitoring and logging
    incidentResponse?: string; // Incident response procedures
  };
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
  responsiblePerson?: string; // User ID or name
  dataProtectionOfficer?: string; // User ID or name
  dataOwner?: {
    name: string;
    email: string;
    department?: string;
    role?: string;
  };
  dataSteward?: {
    name: string;
    email: string;
    department?: string;
    role?: string;
  };
  dataCustodian?: {
    name: string;
    email: string;
    department?: string;
    role?: string;
  };
  keySystems?: string[]; // Systems where this data is processed (e.g., ['CRM', 'ERP', 'HRIS'])
  recipients?: string[]; // Third parties who receive the data
  recipientsDetails?: Array<{
    name: string;
    type: 'CONTROLLER' | 'PROCESSOR' | 'THIRD_PARTY' | 'OTHER';
    country?: string;
    contact?: string;
  }>;
  ownersAffected?: Array<{
    name: string;
    email: string;
    role: string;
    department?: string;
  }>;
  deletionCriteria?: string; // Criteria for data deletion
  accessRights?: {
    whoHasAccess?: string[]; // Roles/departments with access
    accessLevel?: 'READ_ONLY' | 'READ_WRITE' | 'FULL_ACCESS';
    accessControls?: string; // Description of access controls
    auditLogging?: boolean;
  };
  relatedRequirements?: string[]; // Legal requirement IDs
  relatedControls?: string[]; // Control IDs
  consentRequired: boolean;
  consentCount?: number; // Number of consents for this activity
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  regulationType: string;
  pillar?: string; // Privacy pillar this activity relates to
  createdAt?: Date;
  updatedAt?: Date;
}

const DataProcessingRegisterSchema = new Schema<IDataProcessingRegister>(
  {
    activityId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    activityName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
    },
    legalBasis: {
      type: String,
      required: true,
      enum: ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'],
      index: true,
    },
    dataCategories: {
      type: [String],
      required: true,
    },
    dataSubjectCategories: {
      type: [String],
      required: true,
    },
    recipients: [String],
    thirdCountryTransfers: [
      {
        country: String,
        safeguard: String,
      },
    ],
    retentionPeriod: {
      type: String,
      required: true,
    },
    securityMeasures: [String],
    securityMeasuresDetails: {
      encryption: String,
      accessControls: String,
      authentication: String,
      networkSecurity: String,
      physicalSecurity: String,
      backupRecovery: String,
      monitoring: String,
      incidentResponse: String,
    },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'INACTIVE', 'UNDER_REVIEW'],
      default: 'ACTIVE',
      index: true,
    },
    responsiblePerson: String,
    dataProtectionOfficer: String,
    dataOwner: {
      name: String,
      email: String,
      department: String,
      role: String,
    },
    dataSteward: {
      name: String,
      email: String,
      department: String,
      role: String,
    },
    dataCustodian: {
      name: String,
      email: String,
      department: String,
      role: String,
    },
    keySystems: [String],
    recipients: [String],
    recipientsDetails: [{
      name: String,
      type: String,
      country: String,
      contact: String,
    }],
    ownersAffected: [{
      name: String,
      email: String,
      role: String,
      department: String,
    }],
    deletionCriteria: String,
    accessRights: {
      whoHasAccess: [String],
      accessLevel: String,
      accessControls: String,
      auditLogging: Boolean,
    },
    relatedRequirements: [String],
    relatedControls: [String],
    consentRequired: {
      type: Boolean,
      required: true,
      default: false,
    },
    consentCount: {
      type: Number,
      default: 0,
    },
    lastReviewDate: Date,
    nextReviewDate: Date,
    regulationType: {
      type: String,
      required: true,
      index: true,
    },
    pillar: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'dataprocessingregisters',
  }
);

DataProcessingRegisterSchema.index({ regulationType: 1, status: 1 });

let DataProcessingRegister: Model<IDataProcessingRegister>;

if (isLocalStorage()) {
  DataProcessingRegister = new LocalModel<IDataProcessingRegister>('DataProcessingRegister') as any;
} else {
  DataProcessingRegister = mongoose.models.DataProcessingRegister || mongoose.model<IDataProcessingRegister>('DataProcessingRegister', DataProcessingRegisterSchema);
}

export default DataProcessingRegister;
