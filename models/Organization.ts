import mongoose, { Schema, Document } from 'mongoose';
import { useLocalStorage } from '@/lib/local-storage';
import { LocalModel } from './LocalModel';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Organization level
  ADMIN = 'ADMIN', // Affiliate level
  USER = 'USER', // Affiliate level
}

export interface IOrganization extends Document {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let OrganizationModel: any;

if (useLocalStorage()) {
  OrganizationModel = new LocalModel<IOrganization>('Organization');
} else {
  OrganizationModel = mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
}

export default OrganizationModel;

