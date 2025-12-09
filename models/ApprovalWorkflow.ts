import mongoose, { Schema, Document, Types } from 'mongoose';
import { useLocalStorage } from '@/lib/local-storage';
import { LocalModel } from './LocalModel';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ChangeType {
  QUESTIONNAIRE_RESPONSE = 'QUESTIONNAIRE_RESPONSE',
  REMEDIATION_PLAN = 'REMEDIATION_PLAN',
  EVIDENCE_SUBMISSION = 'EVIDENCE_SUBMISSION',
  ROADMAP_EDIT = 'ROADMAP_EDIT',
}

export interface IApprovalWorkflow extends Document {
  workflowId: string;
  changeType: ChangeType;
  entityId: string; // ID of the changed entity (questionnaire, remediation, evidence, roadmap)
  entityType: string; // Type of entity
  affiliateId: Types.ObjectId | string;
  organizationId: Types.ObjectId | string;
  requestedBy: Types.ObjectId | string; // User who made the change
  requestedAt: Date;
  status: ApprovalStatus;
  approvedBy?: Types.ObjectId | string; // Admin/SuperAdmin who approved
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId | string;
  rejectedAt?: Date;
  comments?: string;
  changeDetails: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalWorkflowSchema = new Schema<IApprovalWorkflow>(
  {
    workflowId: {
      type: String,
      required: true,
      unique: true,
    },
    changeType: {
      type: String,
      enum: Object.values(ChangeType),
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    affiliateId: {
      type: Schema.Types.ObjectId,
      ref: 'Affiliate',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(ApprovalStatus),
      default: ApprovalStatus.PENDING,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
    comments: {
      type: String,
    },
    changeDetails: [{
      field: String,
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
    }],
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let ApprovalWorkflowModel: any;

if (useLocalStorage()) {
  ApprovalWorkflowModel = new LocalModel<IApprovalWorkflow>('ApprovalWorkflow');
} else {
  ApprovalWorkflowModel = mongoose.models.ApprovalWorkflow || mongoose.model<IApprovalWorkflow>('ApprovalWorkflow', ApprovalWorkflowSchema);
}

export default ApprovalWorkflowModel;

