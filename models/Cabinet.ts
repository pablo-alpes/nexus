import mongoose, { Schema, Document } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

/**
 * Roles for the Chile Privacy SaaS multitenant model.
 * Shared instance; isolation is by cabinetId / clientId on data rows.
 */
export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN', // Thin platform ops — cabinets only by default
  CABINET_ADMIN = 'CABINET_ADMIN', // Law firm admin — full client portfolio
  CABINET_LAWYER = 'CABINET_LAWYER', // Law firm consultant — clients in cabinet
  CLIENT_USER = 'CLIENT_USER', // Company user — own client only (DSARs, evidence)
}

export interface ICabinet extends Document {
  name: string;
  description?: string;
  slug?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CabinetSchema = new Schema<ICabinet>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

let CabinetModel: any;

if (isLocalStorage()) {
  CabinetModel = new LocalModel<ICabinet>('Cabinet');
} else {
  CabinetModel = mongoose.models.Cabinet || mongoose.model<ICabinet>('Cabinet', CabinetSchema);
}

export default CabinetModel;
