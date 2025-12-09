import mongoose, { Schema, Document, Types } from 'mongoose';
import { useLocalStorage } from '@/lib/local-storage';
import { LocalModel } from './LocalModel';

export interface IAffiliate extends Document {
  affiliateId: string;
  name: string;
  description?: string;
  organizationId: Types.ObjectId | string; // Reference to Organization
  createdAt: Date;
  updatedAt: Date;
}

const AffiliateSchema = new Schema<IAffiliate>(
  {
    affiliateId: {
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
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let AffiliateModel: any;

if (useLocalStorage()) {
  AffiliateModel = new LocalModel<IAffiliate>('Affiliate');
} else {
  AffiliateModel = mongoose.models.Affiliate || mongoose.model<IAffiliate>('Affiliate', AffiliateSchema);
}

export default AffiliateModel;

