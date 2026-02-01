/**
 * BreachNotification Model
 * Manages data breach notifications to authorities and data subjects
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IBreachNotification extends Document {
  breachId: string;
  incidentTitle: string;
  incidentDescription: string;
  breachDate: Date;
  discoveryDate: Date;
  notificationDate?: Date; // Date when breach was reported
  breachType: 'CONFIDENTIALITY' | 'INTEGRITY' | 'AVAILABILITY' | 'COMBINED';
  breachCategory: 'ACCIDENTAL' | 'MALICIOUS' | 'SYSTEM_ERROR' | 'HUMAN_ERROR' | 'OTHER';
  affectedDataCategories: string[];
  affectedDataSubjects: number; // Estimated number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'NOTIFIED_AUTHORITY' | 'NOTIFIED_SUBJECTS' | 'RESOLVED';
  
  // Authority notification
  authorityNotificationRequired: boolean;
  authorityNotificationDate?: Date;
  authorityName?: string; // e.g., 'Agencia de Protección de Datos Personales'
  authorityReference?: string; // Reference number from authority
  
  // Data subject notification
  subjectNotificationRequired: boolean;
  subjectNotificationDate?: Date;
  subjectsNotified?: number;
  notificationMethod?: 'EMAIL' | 'POST' | 'PUBLIC_ANNOUNCEMENT' | 'OTHER';
  
  // Containment and remediation
  containmentMeasures?: string[];
  remediationActions?: string[];
  lessonsLearned?: string;
  
  // Workflow & Process Follow-up (GDPR Best Practice)
  workflowStages?: Array<{
    stage: 'DETECTION' | 'ASSESSMENT' | 'CONTAINMENT' | 'INVESTIGATION' | 'NOTIFICATION_PREP' | 'AUTHORITY_NOTIFICATION' | 'SUBJECT_NOTIFICATION' | 'REMEDIATION' | 'CLOSURE';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
    owner?: string; // User ID responsible
    assignedDate?: Date;
    completedDate?: Date;
    dueDate?: Date;
    notes?: string;
    documents?: string[]; // URLs or paths to documents
  }>;
  currentStage?: string;
  processOwner?: string; // Overall process owner
  businessOwner?: string; // Business owner responsible for the breach
  escalationLevel?: 'NONE' | 'MANAGEMENT' | 'EXECUTIVE' | 'BOARD';
  evidence?: Array<{
    evidenceId: string;
    fileName: string;
    fileType: string;
    uploadedDate: Date;
    uploadedBy: string;
    description?: string;
    blobName?: string; // Azure blob storage name
  }>;
  
  // Related entities
  relatedProcessingActivity?: string; // DataProcessingRegister activityId
  relatedControls?: string[]; // Control IDs that failed
  relatedProcessor?: string; // ThirdPartyProcessor ID if breach originated from processor
  assignedTo?: string; // User ID
  
  regulationType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BreachNotificationSchema = new Schema<IBreachNotification>(
  {
    breachId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    incidentTitle: {
      type: String,
      required: true,
    },
    incidentDescription: {
      type: String,
      required: true,
    },
    breachDate: {
      type: Date,
      required: true,
      index: true,
    },
    discoveryDate: {
      type: Date,
      required: true,
    },
    notificationDate: Date,
    breachType: {
      type: String,
      required: true,
      enum: ['CONFIDENTIALITY', 'INTEGRITY', 'AVAILABILITY', 'COMBINED'],
      index: true,
    },
    breachCategory: {
      type: String,
      required: true,
      enum: ['ACCIDENTAL', 'MALICIOUS', 'SYSTEM_ERROR', 'HUMAN_ERROR', 'OTHER'],
    },
    affectedDataCategories: {
      type: [String],
      required: true,
    },
    affectedDataSubjects: {
      type: Number,
      required: true,
      default: 0,
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DETECTED', 'INVESTIGATING', 'CONTAINED', 'NOTIFIED_AUTHORITY', 'NOTIFIED_SUBJECTS', 'RESOLVED'],
      default: 'DETECTED',
      index: true,
    },
    authorityNotificationRequired: {
      type: Boolean,
      required: true,
      default: false,
    },
    authorityNotificationDate: Date,
    authorityName: String,
    authorityReference: String,
    subjectNotificationRequired: {
      type: Boolean,
      required: true,
      default: false,
    },
    subjectNotificationDate: Date,
    subjectsNotified: Number,
    notificationMethod: {
      type: String,
      enum: ['EMAIL', 'POST', 'PUBLIC_ANNOUNCEMENT', 'OTHER'],
    },
    containmentMeasures: [String],
    remediationActions: [String],
    lessonsLearned: String,
    workflowStages: [
      {
        stage: {
          type: String,
          enum: ['DETECTION', 'ASSESSMENT', 'CONTAINMENT', 'INVESTIGATION', 'NOTIFICATION_PREP', 'AUTHORITY_NOTIFICATION', 'SUBJECT_NOTIFICATION', 'REMEDIATION', 'CLOSURE'],
        },
        status: {
          type: String,
          enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'],
        },
        owner: String,
        assignedDate: Date,
        completedDate: Date,
        dueDate: Date,
        notes: String,
        documents: [String],
      },
    ],
  currentStage: String,
  processOwner: String,
  businessOwner: String,
  escalationLevel: {
      type: String,
      enum: ['NONE', 'MANAGEMENT', 'EXECUTIVE', 'BOARD'],
    },
    relatedProcessingActivity: String,
    relatedControls: [String],
  relatedProcessor: String,
  assignedTo: String,
  evidence: [{
    evidenceId: String,
    fileName: String,
    fileType: String,
    uploadedDate: Date,
    uploadedBy: String,
    description: String,
    blobName: String,
  }],
  regulationType: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'breachnotifications',
  }
);

BreachNotificationSchema.index({ breachId: 1 });
BreachNotificationSchema.index({ regulationType: 1, status: 1 });
BreachNotificationSchema.index({ severity: 1 });
BreachNotificationSchema.index({ breachDate: 1 });
BreachNotificationSchema.index({ authorityNotificationRequired: 1, authorityNotificationDate: 1 });

let BreachNotification: Model<IBreachNotification>;

if (isLocalStorage()) {
  BreachNotification = new LocalModel<IBreachNotification>('BreachNotification') as any;
} else {
  BreachNotification = mongoose.models.BreachNotification || mongoose.model<IBreachNotification>('BreachNotification', BreachNotificationSchema);
}

export default BreachNotification;
