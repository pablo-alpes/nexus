import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from './Cabinet';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IUserPermissions {
  canAccessRuleEngine?: boolean;
  canValidateEvidence?: boolean;
  canEditRuleEngine?: boolean;
  canUploadEvidence?: boolean;
  canManageRoadmap?: boolean;
  isCabinetAdmin?: boolean;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  company?: string;
  role: UserRole;
  cabinetId?: string;
  clientId?: string;
  permissions?: IUserPermissions;
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
      default: UserRole.CLIENT_USER,
    },
    cabinetId: {
      type: Schema.Types.Mixed,
      ref: 'Cabinet',
      index: true,
    },
    clientId: {
      type: String,
      index: true,
    },
    permissions: {
      canAccessRuleEngine: { type: Boolean },
      canValidateEvidence: { type: Boolean },
      canEditRuleEngine: { type: Boolean },
      canUploadEvidence: { type: Boolean, default: true },
      canManageRoadmap: { type: Boolean },
      isCabinetAdmin: { type: Boolean },
    },
  },
  {
    timestamps: true,
  }
);

let UserModel: any;

if (isLocalStorage()) {
  UserModel = new LocalModel<IUser>('User');
} else {
  UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
}

export default UserModel;
