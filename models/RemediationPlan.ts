import mongoose, { Schema, Document, Types } from 'mongoose';
import { DORAPillar } from './DORARequirement';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export enum RemediationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
}

export interface IRemediationAction {
  controlId: Types.ObjectId;
  action: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: RemediationStatus;
  dueDate?: Date;
  assignedTo?: string;
  evidenceIds?: Types.ObjectId[]; // References to Evidence
}

export interface IRemediationPlan extends Document {
  userId: Types.ObjectId;
  regulationType?: string;
  pillar: string; // Changed from DORAPillar to string to support multiple regulations
  actions: IRemediationAction[];
  startDate: Date;
  targetCompletionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RemediationActionSchema = new Schema<IRemediationAction>({
  controlId: { type: Schema.Types.Mixed, ref: 'Control', required: true }, // Mixed for local storage
  action: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  status: { type: String, enum: Object.values(RemediationStatus), default: RemediationStatus.NOT_STARTED },
  dueDate: Date,
  assignedTo: String,
  evidenceIds: [{ type: Schema.Types.Mixed }], // Mixed for local storage
}, { _id: false });

const RemediationPlanSchema = new Schema<IRemediationPlan>(
  {
    userId: {
      type: Schema.Types.Mixed, // Mixed for local storage
      ref: 'User',
      required: true,
    },
    regulationType: {
      type: String,
      default: 'DORA',
    },
    pillar: {
      type: String,
      required: true,
      // Removed enum constraint to support multiple regulations
    },
    actions: [RemediationActionSchema],
    startDate: {
      type: Date,
      default: Date.now,
    },
    targetCompletionDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    validateBeforeSave: false, // Disable validation for local storage
  }
);

// Export model with local storage fallback
let RemediationPlanModel: any;

if (isLocalStorage()) {
  RemediationPlanModel = new LocalModel<IRemediationPlan>('RemediationPlan');
} else {
  RemediationPlanModel = mongoose.models.RemediationPlan || 
    mongoose.model<IRemediationPlan>('RemediationPlan', RemediationPlanSchema);
}

export default RemediationPlanModel;

