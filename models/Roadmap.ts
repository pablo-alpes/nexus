import mongoose, { Schema, Document, Types } from 'mongoose';
import { DORAPillar } from './DORARequirement';
import { useLocalStorage } from '@/lib/local-storage';
import { LocalModel } from './LocalModel';

export interface IRoadmapTask {
  taskId: string;
  title: string;
  description: string;
  pillar: DORAPillar;
  controlId?: string; // Link to control
  requirementId?: string; // Link to requirement
  remediationActionId?: string; // Link to remediation action
  startDate: Date;
  endDate: Date;
  duration: number; // Duration in months
  assignedTo?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dependencies?: string[]; // Array of taskIds this task depends on
  progress?: number; // 0-100
  notes?: string;
}

export interface IRoadmap extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  tasks: IRoadmapTask[];
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapTaskSchema = new Schema<IRoadmapTask>({
  taskId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  pillar: { type: String, enum: Object.values(DORAPillar), required: true },
  controlId: String,
  requirementId: String,
  remediationActionId: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: Number, required: true },
  assignedTo: String,
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'],
    default: 'NOT_STARTED',
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  dependencies: [String],
  progress: { type: Number, min: 0, max: 100, default: 0 },
  notes: String,
}, { _id: false });

const RoadmapSchema = new Schema<IRoadmap>(
  {
    userId: {
      type: Schema.Types.Mixed, // Mixed for local storage
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      default: 'DORA Implementation Roadmap',
    },
    description: String,
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    tasks: [RoadmapTaskSchema],
  },
  {
    timestamps: true,
    validateBeforeSave: false, // Disable validation for local storage
  }
);

// Export model with local storage fallback
let RoadmapModel: any;

if (useLocalStorage()) {
  RoadmapModel = new LocalModel<IRoadmap>('Roadmap');
} else {
  RoadmapModel = mongoose.models.Roadmap || 
    mongoose.model<IRoadmap>('Roadmap', RoadmapSchema);
}

export default RoadmapModel;

