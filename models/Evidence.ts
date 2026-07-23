import mongoose, { Schema, Document, Types } from 'mongoose';

export enum EvidenceType {
  POLICY = 'POLICY',
  PROCEDURE = 'PROCEDURE',
  TEST_RESULT = 'TEST_RESULT',
  AUDIT_REPORT = 'AUDIT_REPORT',
  CONTRACT = 'CONTRACT',
  CERTIFICATE = 'CERTIFICATE',
  SCREENSHOT = 'SCREENSHOT',
  OTHER = 'OTHER',
}

export interface IEvidence extends Document {
  evidenceId: string;
  userId: Types.ObjectId;
  cabinetId?: string;
  clientId?: string;
  article?: string; // e.g. "Artículo 12" — organises evidence by law article
  regulationType?: string;
  controlId?: Types.ObjectId; // Control this evidence supports
  requirementId?: Types.ObjectId; // Requirement this evidence supports
  remediationActionId?: Types.ObjectId; // Optional: if linked to remediation
  fileName: string;
  fileSize: number;
  mimeType: string;
  blobName: string; // Azure Blob Storage name
  evidenceType: EvidenceType;
  description?: string;
  complianceStatus?: string; // Compliance status this evidence supports
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema = new Schema<IEvidence>(
  {
    evidenceId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cabinetId: {
      type: String,
      index: true,
    },
    clientId: {
      type: String,
      index: true,
    },
    article: {
      type: String,
      index: true,
    },
    regulationType: {
      type: String,
      index: true,
    },
    controlId: {
      type: Schema.Types.ObjectId,
      ref: 'Control',
    },
    requirementId: {
      type: Schema.Types.ObjectId,
      ref: 'DORARequirement',
    },
    remediationActionId: {
      type: Schema.Types.ObjectId,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    blobName: {
      type: String,
      required: true,
      unique: true,
    },
    evidenceType: {
      type: String,
      enum: Object.values(EvidenceType),
      required: true,
    },
    description: {
      type: String,
    },
    complianceStatus: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Evidence || mongoose.model<IEvidence>('Evidence', EvidenceSchema);

