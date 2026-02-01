import mongoose, { Schema, Document, Types } from 'mongoose';
import { ControlStatus } from './Control';
import { DORAPillar } from './DORARequirement';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IGap {
  controlId: Types.ObjectId;
  status: ControlStatus;
  gapDescription: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface IGapAnalysis extends Document {
  userId: Types.ObjectId;
  regulationType?: string;
  gaps: IGap[];
  pillar: string; // Changed from DORAPillar to string to support multiple regulations
  totalControls: number;
  implementedControls: number;
  compliancePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

// For local storage, we need to allow strings for controlId
// For MongoDB, it will be ObjectId
const GapSchema = new Schema<IGap>({
  controlId: { 
    type: Schema.Types.Mixed, // Use Mixed to allow both ObjectId and string
    ref: 'Control', 
    required: true 
  },
  status: { type: String, enum: Object.values(ControlStatus), required: true },
  gapDescription: { type: String, required: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
}, { _id: false }); // No validation - handled by LocalModel

const GapAnalysisSchema = new Schema<IGapAnalysis>(
  {
    userId: {
      type: Schema.Types.Mixed, // Allow both ObjectId and string for local storage
      ref: 'User',
      required: true,
    },
    gaps: [GapSchema],
    regulationType: {
      type: String,
      default: 'DORA',
    },
    pillar: {
      type: String,
      required: true,
      // Removed enum constraint to support multiple regulations
    },
    totalControls: {
      type: Number,
      required: true,
    },
    implementedControls: {
      type: Number,
      required: true,
    },
    compliancePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    validateBeforeSave: false, // Disable validation - LocalModel handles it
  }
);

// Export model with local storage fallback
let GapAnalysisModel: any;

if (isLocalStorage()) {
  GapAnalysisModel = new LocalModel<IGapAnalysis>('GapAnalysis');
} else {
  GapAnalysisModel = mongoose.models.GapAnalysis || 
    mongoose.model<IGapAnalysis>('GapAnalysis', GapAnalysisSchema);
}

export default GapAnalysisModel;

