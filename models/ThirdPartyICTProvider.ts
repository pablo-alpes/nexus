/**
 * ThirdPartyICTProvider — DORA TPRM module
 * Manages ICT third-party service providers per DORA Article 28-30
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IThirdPartyICTProvider extends Document {
  providerId: string;
  name: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  country: string;
  providerType:
    | 'CLOUD_IAAS'
    | 'CLOUD_PAAS'
    | 'CLOUD_SAAS'
    | 'DATA_CENTER'
    | 'PAYMENT_NETWORK'
    | 'SOFTWARE_VENDOR'
    | 'MANAGED_SECURITY'
    | 'OTHER';
  criticalityLevel: 1 | 2 | 3 | 4;
  servicesProvided: string[];
  dataProcessed: string[];
  subcontractingAllowed: boolean;
  subProviders?: Array<{ name: string; country: string; services: string[] }>;

  // DORA contractual requirements
  contractSigned: boolean;
  contractDate?: Date;
  contractExpiryDate?: Date;
  doraContractualClauses: {
    auditRights: boolean;
    exitStrategy: boolean;
    incidentNotification: boolean;
    serviceLevelAgreement: boolean;
    dataLocation: boolean;
    subContractingControls: boolean;
  };

  // Risk assessment
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  concentrationRisk: boolean;
  lastAssessmentDate?: Date;
  nextAssessmentDate?: Date;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW' | 'PENDING_ASSESSMENT';

  certifications: Array<{
    type: string;
    issueDate: Date;
    expiryDate?: Date;
  }>;

  followUp?: {
    owner?: string;
    frequencyDays?: number;
    lastReviewDate?: Date;
    nextReviewDate?: Date;
    status?: 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE';
    notes?: string;
  };
  incidentPlaybookUrl?: string;
  incidentResponseContact?: string;
  incidentLog?: Array<{
    createdAt: Date;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary: string;
    actionsTaken?: string[];
  }>;

  linkedControlIds?: string[];
  linkedRequirements?: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  notes?: string;
  regulationType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ThirdPartyICTProviderSchema = new Schema<IThirdPartyICTProvider>(
  {
    providerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    companyName: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: String,
    country: { type: String, required: true, index: true },
    providerType: {
      type: String,
      required: true,
      enum: [
        'CLOUD_IAAS',
        'CLOUD_PAAS',
        'CLOUD_SAAS',
        'DATA_CENTER',
        'PAYMENT_NETWORK',
        'SOFTWARE_VENDOR',
        'MANAGED_SECURITY',
        'OTHER',
      ],
    },
    criticalityLevel: { type: Number, min: 1, max: 4, default: 2 },
    servicesProvided: { type: [String], required: true },
    dataProcessed: { type: [String], default: [] },
    subcontractingAllowed: { type: Boolean, default: false },
    subProviders: [{ name: String, country: String, services: [String] }],
    contractSigned: { type: Boolean, default: false },
    contractDate: Date,
    contractExpiryDate: Date,
    doraContractualClauses: {
      auditRights: { type: Boolean, default: false },
      exitStrategy: { type: Boolean, default: false },
      incidentNotification: { type: Boolean, default: false },
      serviceLevelAgreement: { type: Boolean, default: false },
      dataLocation: { type: Boolean, default: false },
      subContractingControls: { type: Boolean, default: false },
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    concentrationRisk: { type: Boolean, default: false },
    lastAssessmentDate: Date,
    nextAssessmentDate: Date,
    complianceStatus: {
      type: String,
      enum: ['COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW', 'PENDING_ASSESSMENT'],
      default: 'PENDING_ASSESSMENT',
    },
    certifications: [{ type: String, issueDate: Date, expiryDate: Date }],
    followUp: {
      owner: String,
      frequencyDays: { type: Number, default: 90 },
      lastReviewDate: Date,
      nextReviewDate: Date,
      status: {
        type: String,
        enum: ['ON_TRACK', 'DUE_SOON', 'OVERDUE'],
        default: 'ON_TRACK',
      },
      notes: String,
    },
    incidentPlaybookUrl: String,
    incidentResponseContact: String,
    incidentLog: [
      {
        createdAt: { type: Date, default: Date.now },
        severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
        summary: String,
        actionsTaken: [String],
      },
    ],
    linkedControlIds: [String],
    linkedRequirements: [String],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED'],
      default: 'ACTIVE',
    },
    notes: String,
    regulationType: { type: String, required: true, default: 'DORA', index: true },
  },
  { timestamps: true, collection: 'thirdpartyictproviders' }
);

let ThirdPartyICTProvider: Model<IThirdPartyICTProvider>;

if (isLocalStorage()) {
  ThirdPartyICTProvider = new LocalModel<IThirdPartyICTProvider>('ThirdPartyICTProvider') as any;
} else {
  ThirdPartyICTProvider =
    mongoose.models.ThirdPartyICTProvider ||
    mongoose.model<IThirdPartyICTProvider>('ThirdPartyICTProvider', ThirdPartyICTProviderSchema);
}

export default ThirdPartyICTProvider;

export function calculateTPRMRiskLevel(provider: Partial<IThirdPartyICTProvider>): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  let score = 0;
  const clauses = provider.doraContractualClauses || ({} as IThirdPartyICTProvider['doraContractualClauses']);
  if (!provider.contractSigned) score += 2;
  if (!clauses.auditRights) score += 2;
  if (!clauses.exitStrategy) score += 2;
  if (!clauses.incidentNotification) score += 3;
  if (provider.concentrationRisk) score += 3;
  if ((provider.criticalityLevel || 1) >= 4) score += 3;
  else if ((provider.criticalityLevel || 1) >= 3) score += 2;
  if (provider.subcontractingAllowed && !clauses.subContractingControls) score += 2;
  if (score >= 8) return 'CRITICAL';
  if (score >= 5) return 'HIGH';
  if (score >= 2) return 'MEDIUM';
  return 'LOW';
}

export function calculateTPRMComplianceStatus(
  provider: Partial<IThirdPartyICTProvider>
): IThirdPartyICTProvider['complianceStatus'] {
  const clauses = provider.doraContractualClauses || ({} as IThirdPartyICTProvider['doraContractualClauses']);
  const requiredClauses = [
    clauses.auditRights,
    clauses.exitStrategy,
    clauses.incidentNotification,
    clauses.serviceLevelAgreement,
    clauses.dataLocation,
  ];
  const metCount = requiredClauses.filter(Boolean).length;
  if (!provider.contractSigned) return 'NON_COMPLIANT';
  if (metCount >= 4) return 'COMPLIANT';
  if (metCount >= 2) return 'UNDER_REVIEW';
  return 'PENDING_ASSESSMENT';
}

/** Demo seed data for TPRM dashboard */
export const TPRM_DEMO_PROVIDERS: Partial<IThirdPartyICTProvider>[] = [
  {
    providerId: 'TPRM-AWS-001',
    name: 'Amazon Web Services',
    companyName: 'Amazon Web Services EMEA SARL',
    contactEmail: 'enterprise@aws.amazon.com',
    country: 'IE',
    providerType: 'CLOUD_IAAS',
    criticalityLevel: 4,
    servicesProvided: ['Cloud Infrastructure', 'Data Storage', 'Compute'],
    dataProcessed: ['Customer data', 'Transaction logs', 'System backups'],
    subcontractingAllowed: true,
    contractSigned: true,
    doraContractualClauses: {
      auditRights: true,
      exitStrategy: true,
      incidentNotification: true,
      serviceLevelAgreement: true,
      dataLocation: true,
      subContractingControls: true,
    },
    concentrationRisk: true,
    linkedRequirements: ['DORA-REQ-180', 'DORA-REQ-181', 'DORA-REQ-182'],
    status: 'ACTIVE',
    regulationType: 'DORA',
  },
  {
    providerId: 'TPRM-SF-002',
    name: 'Salesforce Financial Services Cloud',
    companyName: 'Salesforce.com Inc.',
    contactEmail: 'support@salesforce.com',
    country: 'US',
    providerType: 'CLOUD_SAAS',
    criticalityLevel: 3,
    servicesProvided: ['CRM', 'Customer onboarding workflows'],
    dataProcessed: ['Customer PII', 'KYC documents'],
    subcontractingAllowed: false,
    contractSigned: true,
    doraContractualClauses: {
      auditRights: true,
      exitStrategy: false,
      incidentNotification: true,
      serviceLevelAgreement: true,
      dataLocation: true,
      subContractingControls: false,
    },
    concentrationRisk: false,
    linkedRequirements: ['DORA-REQ-183', 'DORA-REQ-184'],
    status: 'ACTIVE',
    regulationType: 'DORA',
  },
  {
    providerId: 'TPRM-LOCAL-003',
    name: 'Local Payment Gateway',
    companyName: 'PayTech Solutions SL',
    contactEmail: 'compliance@paytech.local',
    country: 'ES',
    providerType: 'PAYMENT_NETWORK',
    criticalityLevel: 4,
    servicesProvided: ['Payment processing', 'Settlement'],
    dataProcessed: ['Payment card data', 'Transaction records'],
    subcontractingAllowed: true,
    contractSigned: false,
    doraContractualClauses: {
      auditRights: false,
      exitStrategy: false,
      incidentNotification: false,
      serviceLevelAgreement: false,
      dataLocation: true,
      subContractingControls: false,
    },
    concentrationRisk: false,
    linkedRequirements: ['DORA-REQ-185'],
    status: 'ACTIVE',
    regulationType: 'DORA',
  },
];
