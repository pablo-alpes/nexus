import mongoose, { Schema, Document } from 'mongoose';
import { useLocalStorage } from '@/lib/local-storage';
import { LocalModel } from './LocalModel';

export interface IRuleVersion extends Document {
  version: string; // e.g., "2.0", "2.1"
  isoControlsVersion: string; // From iso27002-controls.json
  requirementsVersion?: string; // From dora-requirements-final.json
  questionsVersion?: string; // From questionnaire structure
  effectiveDate: Date;
  changes?: {
    controlsAdded?: number;
    controlsModified?: number;
    requirementsAdded?: number;
    requirementsModified?: number;
  };
  precomputedAt?: Date;
  status: 'PENDING' | 'PRE_COMPUTING' | 'ACTIVE' | 'DEPRECATED';
  metadata?: {
    totalControls: number;
    totalRequirements: number;
    totalQuestions: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RuleVersionSchema = new Schema<IRuleVersion>(
  {
    version: {
      type: String,
      required: true,
      unique: true,
    },
    isoControlsVersion: {
      type: String,
      required: true,
    },
    requirementsVersion: String,
    questionsVersion: String,
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    changes: {
      controlsAdded: Number,
      controlsModified: Number,
      requirementsAdded: Number,
      requirementsModified: Number,
    },
    precomputedAt: Date,
    status: {
      type: String,
      enum: ['PENDING', 'PRE_COMPUTING', 'ACTIVE', 'DEPRECATED'],
      default: 'PENDING',
    },
    metadata: {
      totalControls: Number,
      totalRequirements: Number,
      totalQuestions: Number,
    },
  },
  {
    timestamps: true,
    validateBeforeSave: false,
  }
);

// Export model with local storage fallback
let RuleVersionModel: any;

if (useLocalStorage()) {
  RuleVersionModel = new LocalModel<IRuleVersion>('RuleVersion');
} else {
  RuleVersionModel = mongoose.models.RuleVersion || 
    mongoose.model<IRuleVersion>('RuleVersion', RuleVersionSchema);
}

export default RuleVersionModel;

