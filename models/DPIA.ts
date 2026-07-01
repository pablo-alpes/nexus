/**
 * Data Protection Impact Assessment (DPIA) Model
 * GDPR Article 35 - DPIA documentation
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';
import { RegulationType } from '@/lib/regulations';

export interface IDPIA extends Document {
  dpiaId: string;
  projectId: string; // Reference to PrivacyByDesignProject
  projectName: string;
  
  // DPIA Details
  status: 'DRAFT' | 'IN_REVIEW' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REQUIRES_REVISION';
  version: string;
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  creationDate: Date;
  submissionDate?: Date;
  approvalDate?: Date;
  
  // Section 1: Necessity and Proportionality
  necessityDescription: string;
  proportionalityAssessment: string;
  alternativesConsidered?: string[];
  
  // Section 2: Data Processing Description
  processingDescription: string;
  dataCategories: string[];
  dataSubjectCategories: string[];
  dataVolumes?: string;
  dataSources: string[];
  dataRecipients: string[];
  retentionPeriod: string;
  internationalTransfers: boolean;
  transferSafeguards?: string[];
  
  // Section 3: Risk Assessment
  risks: Array<{
    riskId: string;
    riskDescription: string;
    riskType: 'CONFIDENTIALITY' | 'INTEGRITY' | 'AVAILABILITY' | 'PRIVACY' | 'OTHER';
    likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedDataSubjects?: string;
    mitigationMeasures?: string[];
  }>;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Section 4: Mitigation Measures
  mitigationMeasures: Array<{
    measureId: string;
    measureDescription: string;
    controlId?: string; // Reference to control
    responsible: string;
    implementationDate?: Date;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
  
  // Section 5: Consultation
  dataProtectionOfficerConsulted: boolean;
  dpoConsultationDate?: Date;
  dpoComments?: string;
  dataSubjectsConsulted: boolean;
  dataSubjectConsultationDetails?: string;
  
  // Section 6: Residual Risk
  residualRisks: Array<{
    riskId: string;
    description: string;
    residualRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    acceptanceJustification?: string;
  }>;
  
  // Section 7: Approval
  approvalRequired: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalConditions?: string[];
  rejectionReason?: string;
  
  // Related Documents
  relatedDocuments?: string[]; // URLs or paths
  
  regulationType: RegulationType;
  createdAt?: Date;
  updatedAt?: Date;
}

const DPIASchema = new Schema<IDPIA>(
  {
    dpiaId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'IN_REVIEW', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REQUIRES_REVISION'],
      default: 'DRAFT',
      index: true,
    },
    version: {
      type: String,
      required: true,
      default: '1.0',
    },
    createdBy: {
      type: String,
      required: true,
    },
    reviewedBy: String,
    approvedBy: String,
    creationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submissionDate: Date,
    approvalDate: Date,
    necessityDescription: {
      type: String,
      required: true,
    },
    proportionalityAssessment: {
      type: String,
      required: true,
    },
    alternativesConsidered: [String],
    processingDescription: {
      type: String,
      required: true,
    },
    dataCategories: {
      type: [String],
      required: true,
    },
    dataSubjectCategories: {
      type: [String],
      required: true,
    },
    dataVolumes: String,
    dataSources: [String],
    dataRecipients: [String],
    retentionPeriod: {
      type: String,
      required: true,
    },
    internationalTransfers: {
      type: Boolean,
      default: false,
    },
    transferSafeguards: [String],
    risks: [
      {
        riskId: String,
        riskDescription: String,
        riskType: {
          type: String,
          enum: ['CONFIDENTIALITY', 'INTEGRITY', 'AVAILABILITY', 'PRIVACY', 'OTHER'],
        },
        likelihood: {
          type: String,
          enum: ['LOW', 'MEDIUM', 'HIGH'],
        },
        impact: {
          type: String,
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        },
        riskLevel: {
          type: String,
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        },
        affectedDataSubjects: String,
        mitigationMeasures: [String],
      },
    ],
    overallRiskLevel: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    mitigationMeasures: [
      {
        measureId: String,
        measureDescription: String,
        controlId: String,
        responsible: String,
        implementationDate: Date,
        status: {
          type: String,
          enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED'],
        },
      },
    ],
    dataProtectionOfficerConsulted: {
      type: Boolean,
      default: false,
    },
    dpoConsultationDate: Date,
    dpoComments: String,
    dataSubjectsConsulted: {
      type: Boolean,
      default: false,
    },
    dataSubjectConsultationDetails: String,
    residualRisks: [
      {
        riskId: String,
        description: String,
        residualRiskLevel: {
          type: String,
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        },
        acceptanceJustification: String,
      },
    ],
    approvalRequired: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
    },
    approvalConditions: [String],
    rejectionReason: String,
    relatedDocuments: [String],
    regulationType: {
      type: String,
      enum: Object.values(RegulationType),
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'dpias',
  }
);

DPIASchema.index({ regulationType: 1, status: 1 });

let DPIA: Model<IDPIA>;

if (isLocalStorage()) {
  DPIA = new LocalModel<IDPIA>('DPIA') as any;
} else {
  DPIA = mongoose.models.DPIA || mongoose.model<IDPIA>('DPIA', DPIASchema);
}

export default DPIA;
