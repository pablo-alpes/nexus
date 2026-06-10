import mongoose, { Schema, Document } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';
import { RegulationType } from '@/lib/regulations';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  company?: string;
  /** Primary regulation module the user wants to see (dashboard default) */
  preferredRegulation?: RegulationType;
  /** Regulation modules enabled for this user (for nav and feature access) */
  enabledRegulations?: RegulationType[];
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
    preferredRegulation: {
      type: String,
      enum: Object.values(RegulationType),
      default: RegulationType.DORA,
    },
    enabledRegulations: {
      type: [String],
      enum: Object.values(RegulationType),
      default: [RegulationType.DORA, RegulationType.CHILEAN_PRIVACY],
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

