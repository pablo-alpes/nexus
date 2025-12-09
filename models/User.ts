import mongoose, { Schema, Document, Types } from 'mongoose';
import { useLocalStorage } from '@/lib/local-storage';
import { LocalModel } from './LocalModel';
import { UserRole } from './Organization';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  company?: string;
  role: UserRole;
  organizationId?: Types.ObjectId | string; // For SUPER_ADMIN
  affiliateId?: Types.ObjectId | string; // For ADMIN and USER
  permissions?: {
    canAccessRuleEngine?: boolean;
    canValidateEvidence?: boolean;
    canEditRuleEngine?: boolean; // Rule engine editor
    canUploadEvidence?: boolean; // Only contributor to upload evidences
    canManageRoadmap?: boolean; // Manager of roadmap
    isOrganizationAdmin?: boolean; // Organization admin (can manage users in their organization)
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    company: {
      type: String,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    affiliateId: {
      type: Schema.Types.ObjectId,
      ref: 'Affiliate',
    },
    permissions: {
      canAccessRuleEngine: {
        type: Boolean,
        default: false,
      },
      canValidateEvidence: {
        type: Boolean,
        default: false,
      },
      canEditRuleEngine: {
        type: Boolean,
        default: false,
      },
      canUploadEvidence: {
        type: Boolean,
        default: true, // Default: allow upload
      },
      canManageRoadmap: {
        type: Boolean,
        default: false,
      },
      isOrganizationAdmin: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let UserModel: any;

if (useLocalStorage()) {
  UserModel = new LocalModel<IUser>('User');
} else {
  UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
}

export default UserModel;

