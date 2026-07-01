/**
 * Consent Model
 * Manages consent records for data processing activities
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IConsent extends Document {
  consentId: string;
  dataSubjectEmail: string;
  dataSubjectName?: string;
  dataSubjectId?: string; // ID number for verification (Ley 21.719)
  processingActivityId: string; // Reference to DataProcessingRegister
  consentType: 'EXPLICIT' | 'IMPLICIT' | 'OPT_IN' | 'OPT_OUT';
  consentStatus: 'GIVEN' | 'WITHDRAWN' | 'EXPIRED';
  consentDate: Date;
  withdrawalDate?: Date;
  withdrawalReason?: string; // Reason for withdrawal (Ley 21.719)
  expiryDate?: Date;
  privacyPolicyVersion: string;
  consentMethod: 'WEB_FORM' | 'EMAIL' | 'PHONE' | 'PAPER' | 'IN_PERSON' | 'OTHER';
  // Legal basis and justification (Ley 21.719 Art. 12)
  legalBasis: string[]; // CONSENT, CONTRACT, LEGAL_OBLIGATION, LEGITIMATE_INTEREST, etc.
  legalBasisJustification?: string; // Why this legal basis applies
  userJustification?: string; // User's reason/justification for granting consent
  purposeDescription?: string; // Detailed description of the purpose
  ipAddress?: string;
  userAgent?: string;
  evidence?: string; // URL or path to consent evidence
  notes?: string;
  regulationType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ConsentSchema = new Schema<IConsent>(
  {
    consentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    dataSubjectEmail: {
      type: String,
      required: true,
      index: true,
    },
    dataSubjectName: String,
    dataSubjectId: String,
    processingActivityId: {
      type: String,
      required: true,
      index: true,
    },
    consentType: {
      type: String,
      required: true,
      enum: ['EXPLICIT', 'IMPLICIT', 'OPT_IN', 'OPT_OUT'],
      index: true,
    },
    consentStatus: {
      type: String,
      required: true,
      enum: ['GIVEN', 'WITHDRAWN', 'EXPIRED'],
      default: 'GIVEN',
      index: true,
    },
    consentDate: {
      type: Date,
      required: true,
      index: true,
    },
    withdrawalDate: Date,
    withdrawalReason: String,
    expiryDate: Date,
    privacyPolicyVersion: {
      type: String,
      required: true,
    },
    consentMethod: {
      type: String,
      required: true,
      enum: ['WEB_FORM', 'EMAIL', 'PHONE', 'PAPER', 'IN_PERSON', 'OTHER'],
    },
    legalBasis: {
      type: [String],
      required: true,
    },
    legalBasisJustification: String,
    userJustification: String,
    purposeDescription: String,
    ipAddress: String,
    userAgent: String,
    evidence: String,
    notes: String,
    regulationType: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'consents',
  }
);

ConsentSchema.index({ regulationType: 1, consentStatus: 1 });
ConsentSchema.index({ dataSubjectEmail: 1, processingActivityId: 1 });

let Consent: Model<IConsent>;

if (isLocalStorage()) {
  Consent = new LocalModel<IConsent>('Consent') as any;
} else {
  Consent = mongoose.models.Consent || mongoose.model<IConsent>('Consent', ConsentSchema);
}

export default Consent;
