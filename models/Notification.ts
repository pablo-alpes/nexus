/**
 * Notification Model
 * Tracks notifications sent to business owners, data owners, stewards, etc.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';
import { RegulationType } from '@/lib/regulations';

export interface INotification extends Document {
  notificationId: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: 'DATA_OWNER' | 'DATA_STEWARD' | 'DATA_CUSTODIAN' | 'PROCESS_OWNER' | 'BUSINESS_OWNER' | 'OTHER';
  notificationType: 'BREACH_ALERT' | 'DATA_SUBJECT_REQUEST' | 'PRIVACY_PROJECT_UPDATE' | 'COMPLIANCE_REVIEW' | 'RISK_ALERT' | 'DEADLINE_REMINDER' | 'OTHER';
  subject: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'SENT' | 'READ' | 'ACKNOWLEDGED' | 'FAILED';
  sentDate?: Date;
  readDate?: Date;
  acknowledgedDate?: Date;
  relatedEntityType?: string; // e.g., 'BreachNotification', 'DataSubjectRequest', 'PrivacyByDesignProject'
  relatedEntityId?: string; // ID of the related entity
  actionRequired?: boolean;
  actionDescription?: string;
  dueDate?: Date;
  metadata?: Record<string, any>; // Additional context
  regulationType: RegulationType;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      required: true,
    },
    recipientRole: {
      type: String,
      required: true,
      enum: ['DATA_OWNER', 'DATA_STEWARD', 'DATA_CUSTODIAN', 'PROCESS_OWNER', 'BUSINESS_OWNER', 'OTHER'],
      index: true,
    },
    notificationType: {
      type: String,
      required: true,
      enum: ['BREACH_ALERT', 'DATA_SUBJECT_REQUEST', 'PRIVACY_PROJECT_UPDATE', 'COMPLIANCE_REVIEW', 'RISK_ALERT', 'DEADLINE_REMINDER', 'OTHER'],
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'SENT', 'READ', 'ACKNOWLEDGED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    sentDate: Date,
    readDate: Date,
    acknowledgedDate: Date,
    relatedEntityType: String,
    relatedEntityId: String,
    actionRequired: {
      type: Boolean,
      default: false,
    },
    actionDescription: String,
    dueDate: Date,
    metadata: Schema.Types.Mixed,
    regulationType: {
      type: String,
      enum: Object.values(RegulationType),
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

NotificationSchema.index({ notificationId: 1 });
NotificationSchema.index({ regulationType: 1, status: 1 });
NotificationSchema.index({ recipientEmail: 1, status: 1 });
NotificationSchema.index({ notificationType: 1, priority: 1 });
NotificationSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });

let Notification: Model<INotification>;

if (isLocalStorage()) {
  Notification = new LocalModel<INotification>('Notification') as any;
} else {
  Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
}

export default Notification;
