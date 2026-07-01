/**
 * DataSubjectRequest Model
 * Manages data subject rights requests (access, rectification, deletion, portability, etc.)
 */

import mongoose, { Schema, Document } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IDataSubjectRequest extends Document {
  requestId: string;
  requestType: 'ACCESS' | 'RECTIFICATION' | 'DELETION' | 'PORTABILITY' | 'OPPOSITION' | 'RESTRICTION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  dataSubjectName: string;
  dataSubjectEmail: string;
  dataSubjectId?: string; // Optional ID for verification
  description?: string;
  requestedData?: string[]; // Categories of data requested
  response?: string;
  responseDocument?: string; // URL or path to response document
  dueDate: Date;
  completedDate?: Date;
  assignedTo?: string; // User ID
  notes?: string;
  regulationType: string; // CHILEAN_PRIVACY, etc.
  relatedProcessingActivities?: string[]; // References to DataProcessingRegister
  createdAt?: Date;
  updatedAt?: Date;
}

const DataSubjectRequestSchema = new Schema<IDataSubjectRequest>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requestType: {
      type: String,
      required: true,
      enum: ['ACCESS', 'RECTIFICATION', 'DELETION', 'PORTABILITY', 'OPPOSITION', 'RESTRICTION'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    dataSubjectName: {
      type: String,
      required: true,
    },
    dataSubjectEmail: {
      type: String,
      required: true,
      index: true,
    },
    dataSubjectId: String,
    description: String,
    requestedData: [String],
    response: String,
    responseDocument: String,
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    completedDate: Date,
    assignedTo: String,
    notes: String,
    regulationType: {
      type: String,
      required: true,
      index: true,
    },
    relatedProcessingActivities: [String],
  },
  {
    timestamps: true,
    collection: 'datasubjectrequests',
  }
);

DataSubjectRequestSchema.index({ regulationType: 1, status: 1 });

let DataSubjectRequest: Model<IDataSubjectRequest>;

if (isLocalStorage()) {
  DataSubjectRequest = new LocalModel<IDataSubjectRequest>('DataSubjectRequest') as any;
} else {
  DataSubjectRequest = mongoose.models.DataSubjectRequest || mongoose.model<IDataSubjectRequest>('DataSubjectRequest', DataSubjectRequestSchema);
}

export default DataSubjectRequest;
