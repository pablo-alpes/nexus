import mongoose, { Schema, Document, Types } from 'mongoose';
import { useLocalStorage } from '@/lib/local-storage';
import { LocalModel } from './LocalModel';

export enum AssetType {
  APPLICATION = 'APPLICATION',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  THIRD_PARTY_SERVICE = 'THIRD_PARTY_SERVICE',
  DATA_STORAGE = 'DATA_STORAGE',
  SECURITY_TOOL = 'SECURITY_TOOL',
  OTHER = 'OTHER',
}

export enum CriticalityLevel {
  LEVEL_1 = 1, // Low
  LEVEL_2 = 2, // Medium
  LEVEL_3 = 3, // High
  LEVEL_4 = 4, // Critical
}

export interface IAsset extends Document {
  assetId: string;
  name: string;
  description: string;
  assetType: AssetType;
  criticalityLevel: CriticalityLevel;
  owner?: string;
  location?: string;
  userId: Types.ObjectId; // Reference to User
  controls: Types.ObjectId[]; // References to applicable Controls
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    assetId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    assetType: {
      type: String,
      enum: Object.values(AssetType),
      required: true,
    },
    criticalityLevel: {
      type: Number,
      enum: Object.values(CriticalityLevel),
      required: true,
    },
    owner: {
      type: String,
    },
    location: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    controls: [{
      type: Schema.Types.ObjectId,
      ref: 'Control',
    }],
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let AssetModel: any;

if (useLocalStorage()) {
  AssetModel = new LocalModel<IAsset>('Asset');
} else {
  AssetModel = mongoose.models.Asset || mongoose.model<IAsset>('Asset', AssetSchema);
}

export default AssetModel;

