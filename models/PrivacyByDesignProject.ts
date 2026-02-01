/**
 * Privacy by Design Project Model
 * Tracks projects with privacy considerations and DPIA requirements
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';
import { RegulationType } from '@/lib/regulations';

export interface IPrivacyByDesignProject extends Document {
  projectId: string;
  projectName: string;
  description: string;
  projectType: 'NEW_SYSTEM' | 'SYSTEM_UPDATE' | 'DATA_PROCESSING' | 'THIRD_PARTY_INTEGRATION' | 'OTHER';
  status: 'PLANNING' | 'IN_PROGRESS' | 'DPIA_REQUIRED' | 'DPIA_IN_PROGRESS' | 'DPIA_APPROVED' | 'DPIA_REJECTED' | 'COMPLETED' | 'CANCELLED';
  
  // Project Details
  startDate: Date;
  expectedCompletionDate?: Date;
  actualCompletionDate?: Date;
  projectOwner: string; // User ID or name
  projectManager?: string;
  businessUnit: string;
  
  // Privacy Assessment
  dpiaRequired: boolean;
  dpiaStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REQUIRES_REVISION';
  dpiaId?: string; // Reference to DPIA document
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  initialRiskAssessment?: string;
  
  // Data Processing Details
  dataCategories: string[];
  dataSubjectCategories: string[];
  processingPurposes: string[];
  legalBasis: string[];
  retentionPeriod?: string;
  internationalTransfers: boolean;
  transferDetails?: string;
  
  // Privacy Controls
  privacyControls: Array<{
    controlId: string;
    controlName: string;
    implementationStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_APPLICABLE';
    implementationDate?: Date;
    responsible: string;
    notes?: string;
  }>;
  
  // Committee Decisions
  committeeDecisions: Array<{
    decisionId: string;
    decisionDate: Date;
    committee: string; // e.g., 'Privacy Committee', 'Data Protection Board'
    decision: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED' | 'DEFERRED';
    conditions?: string[];
    notes?: string;
    approvedBy: string;
  }>;
  
  // Related Entities
  relatedProcessingActivities?: string[]; // DataProcessingRegister activityIds
  relatedThirdPartyProcessors?: string[]; // ThirdPartyProcessor IDs
  
  // Compliance
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' | 'PENDING';
  complianceNotes?: string;
  
  // Mitigation Plan
  mitigationPlan?: {
    tasks: Array<{
      taskId: string;
      taskName: string;
      description?: string;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
      owner: string; // User ID or name
      dueDate?: Date;
      completedDate?: Date;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      relatedControl?: string; // Control ID
      notes?: string;
    }>;
    overallStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    lastUpdated?: Date;
  };
  
  regulationType: RegulationType;
  createdAt?: Date;
  updatedAt?: Date;
}

const PrivacyByDesignProjectSchema = new Schema<IPrivacyByDesignProject>(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    projectType: {
      type: String,
      required: true,
      enum: ['NEW_SYSTEM', 'SYSTEM_UPDATE', 'DATA_PROCESSING', 'THIRD_PARTY_INTEGRATION', 'OTHER'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PLANNING', 'IN_PROGRESS', 'DPIA_REQUIRED', 'DPIA_IN_PROGRESS', 'DPIA_APPROVED', 'DPIA_REJECTED', 'COMPLETED', 'CANCELLED'],
      default: 'PLANNING',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expectedCompletionDate: Date,
    actualCompletionDate: Date,
    projectOwner: {
      type: String,
      required: true,
    },
    projectManager: String,
    businessUnit: {
      type: String,
      required: true,
    },
    dpiaRequired: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    dpiaStatus: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REQUIRES_REVISION'],
    },
    dpiaId: String,
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      index: true,
    },
    initialRiskAssessment: String,
    dataCategories: [String],
    dataSubjectCategories: [String],
    processingPurposes: [String],
    legalBasis: [String],
    retentionPeriod: String,
    internationalTransfers: {
      type: Boolean,
      default: false,
    },
    transferDetails: String,
    privacyControls: [
      {
        controlId: String,
        controlName: String,
        implementationStatus: {
          type: String,
          enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE'],
        },
        implementationDate: Date,
        responsible: String,
        notes: String,
      },
    ],
    committeeDecisions: [
      {
        decisionId: String,
        decisionDate: Date,
        committee: String,
        decision: {
          type: String,
          enum: ['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'DEFERRED'],
        },
        conditions: [String],
        notes: String,
        approvedBy: String,
      },
    ],
    relatedProcessingActivities: [String],
    relatedThirdPartyProcessors: [String],
    complianceStatus: {
      type: String,
      enum: ['COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW', 'PENDING'],
      default: 'PENDING',
      index: true,
    },
    complianceNotes: String,
    mitigationPlan: {
      tasks: [{
        taskId: String,
        taskName: String,
        description: String,
        status: {
          type: String,
          enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'],
          default: 'NOT_STARTED',
        },
        owner: String,
        dueDate: Date,
        completedDate: Date,
        priority: {
          type: String,
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          default: 'MEDIUM',
        },
        relatedControl: String,
        notes: String,
      }],
      overallStatus: {
        type: String,
        enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
        default: 'NOT_STARTED',
      },
      lastUpdated: Date,
    },
    regulationType: {
      type: String,
      enum: Object.values(RegulationType),
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'privacybydesignprojects',
  }
);

PrivacyByDesignProjectSchema.index({ projectId: 1 });
PrivacyByDesignProjectSchema.index({ regulationType: 1, status: 1 });
PrivacyByDesignProjectSchema.index({ dpiaRequired: 1, dpiaStatus: 1 });
PrivacyByDesignProjectSchema.index({ riskLevel: 1 });

let PrivacyByDesignProject: Model<IPrivacyByDesignProject>;

if (isLocalStorage()) {
  PrivacyByDesignProject = new LocalModel<IPrivacyByDesignProject>('PrivacyByDesignProject') as any;
} else {
  PrivacyByDesignProject = mongoose.models.PrivacyByDesignProject || mongoose.model<IPrivacyByDesignProject>('PrivacyByDesignProject', PrivacyByDesignProjectSchema);
}

export default PrivacyByDesignProject;
