import mongoose, { Schema, Document, Types } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

/**
 * Client company under a law Cabinet (tenant portfolio entry).
 */
export interface IClient extends Document {
  clientId: string;
  name: string;
  description?: string;
  cabinetId: Types.ObjectId | string;
  industry?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    cabinetId: {
      type: Schema.Types.Mixed,
      ref: 'Cabinet',
      required: true,
      index: true,
    },
    industry: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

ClientSchema.index({ cabinetId: 1, clientId: 1 });

let ClientModel: any;

if (isLocalStorage()) {
  ClientModel = new LocalModel<IClient>('Client');
} else {
  ClientModel = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
}

export default ClientModel;
