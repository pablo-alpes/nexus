/**
 * ThirdPartyProcessor Model
 * Manages third-party data processors (GDPR Article 28 compliant)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IThirdPartyProcessor extends Document {
  processorId: string;
  name: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  country: string;
  processorType: 'CLOUD_PROVIDER' | 'SaaS' | 'PAAS' | 'IAAS' | 'DATA_ANALYTICS' | 'PAYMENT_PROCESSOR' | 'MARKETING' | 'HR' | 'OTHER';
  servicesProvided: string[]; // Services provided by the processor
  dataCategoriesProcessed: string[]; // Categories of personal data processed
  processingPurposes: string[]; // Purposes for which data is processed
  dataSubjectCategories: string[]; // Categories of data subjects
  
  // Contract & Compliance
  contractSigned: boolean;
  contractDate?: Date;
  contractExpiryDate?: Date;
  contractDocument?: string; // URL or path to contract
  dpaSigned: boolean; // Data Processing Agreement signed
  dpaDate?: Date;
  dpaDocument?: string;
  sccSigned: boolean; // Standard Contractual Clauses (for transfers)
  sccDate?: Date;
  sccDocument?: string;
  
  // Compliance & Certifications
  certifications: Array<{
    type: string; // ISO 27001, SOC 2, etc.
    certificationBody: string;
    issueDate: Date;
    expiryDate?: Date;
    certificateNumber?: string;
  }>;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' | 'PENDING_ASSESSMENT';
  lastAssessmentDate?: Date;
  nextAssessmentDate?: Date;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Security & Controls
  securityMeasures: string[]; // Security measures implemented
  breachNotificationCapability: boolean; // Can notify within required timeframe
  subProcessorDisclosure: boolean; // Disclosed sub-processors
  subProcessors?: Array<{
    name: string;
    country: string;
    services: string[];
  }>;
  
  // Data Transfers
  transfersToThirdCountries: boolean;
  thirdCountries?: string[];
  transferSafeguards?: Array<{
    type: 'SCC' | 'BCR' | 'ADEQUACY' | 'CERTIFICATION' | 'OTHER';
    description: string;
    document?: string;
  }>;
  
  // Processing Activities
  relatedProcessingActivities?: string[]; // DataProcessingRegister activityIds
  
  // Operational
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  assignedOwner?: string; // User ID responsible
  notes?: string;
  
  regulationType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ThirdPartyProcessorSchema = new Schema<IThirdPartyProcessor>(
  {
    processorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
      index: true,
    },
    contactPhone: String,
    address: String,
    country: {
      type: String,
      required: true,
      index: true,
    },
    processorType: {
      type: String,
      required: true,
      enum: ['CLOUD_PROVIDER', 'SaaS', 'PAAS', 'IAAS', 'DATA_ANALYTICS', 'PAYMENT_PROCESSOR', 'MARKETING', 'HR', 'OTHER'],
      index: true,
    },
    servicesProvided: {
      type: [String],
      required: true,
    },
    dataCategoriesProcessed: {
      type: [String],
      required: true,
    },
    processingPurposes: {
      type: [String],
      required: true,
    },
    dataSubjectCategories: {
      type: [String],
      required: true,
    },
    contractSigned: {
      type: Boolean,
      required: true,
      default: false,
    },
    contractDate: Date,
    contractExpiryDate: Date,
    contractDocument: String,
    dpaSigned: {
      type: Boolean,
      required: true,
      default: false,
    },
    dpaDate: Date,
    dpaDocument: String,
    sccSigned: {
      type: Boolean,
      default: false,
    },
    sccDate: Date,
    sccDocument: String,
    certifications: [
      {
        type: String,
        certificationBody: String,
        issueDate: Date,
        expiryDate: Date,
        certificateNumber: String,
      },
    ],
    complianceStatus: {
      type: String,
      required: true,
      enum: ['COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW', 'PENDING_ASSESSMENT'],
      default: 'PENDING_ASSESSMENT',
      index: true,
    },
    lastAssessmentDate: Date,
    nextAssessmentDate: Date,
    riskLevel: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    securityMeasures: [String],
    breachNotificationCapability: {
      type: Boolean,
      default: false,
    },
    subProcessorDisclosure: {
      type: Boolean,
      default: false,
    },
    subProcessors: [
      {
        name: String,
        country: String,
        services: [String],
      },
    ],
    transfersToThirdCountries: {
      type: Boolean,
      default: false,
    },
    thirdCountries: [String],
    transferSafeguards: [
      {
        type: {
          type: String,
          enum: ['SCC', 'BCR', 'ADEQUACY', 'CERTIFICATION', 'OTHER'],
        },
        description: String,
        document: String,
      },
    ],
    relatedProcessingActivities: [String],
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED'],
      default: 'ACTIVE',
      index: true,
    },
    assignedOwner: String,
    notes: String,
    regulationType: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'thirdpartyprocessors',
  }
);

ThirdPartyProcessorSchema.index({ processorId: 1 });
ThirdPartyProcessorSchema.index({ regulationType: 1, status: 1 });
ThirdPartyProcessorSchema.index({ complianceStatus: 1 });
ThirdPartyProcessorSchema.index({ riskLevel: 1 });
ThirdPartyProcessorSchema.index({ country: 1 });

let ThirdPartyProcessor: Model<IThirdPartyProcessor>;

if (isLocalStorage()) {
  ThirdPartyProcessor = new LocalModel<IThirdPartyProcessor>('ThirdPartyProcessor') as any;
} else {
  ThirdPartyProcessor = mongoose.models.ThirdPartyProcessor || mongoose.model<IThirdPartyProcessor>('ThirdPartyProcessor', ThirdPartyProcessorSchema);
}

export default ThirdPartyProcessor;
