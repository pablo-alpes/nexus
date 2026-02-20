import mongoose, { Schema, Document } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface INLPSimilarity {
  requirementId: string;
  similarity: number; // 0.0 to 1.0
  isControlBased: boolean; // True if requirement comes from control mapping
  confidence: 'high' | 'medium' | 'low'; // Based on similarity score
}

export interface IQuestionMapping extends Document {
  questionId: string;
  ruleVersion: string; // Rule version this mapping is for
  regulationType?: string; // DORA | CHILEAN_PRIVACY - for separate persistence per regulation
  controlBasedRequirements: string[]; // Requirements from control mappings
  nlpSimilarities: INLPSimilarity[]; // All requirements with NLP similarity scores
  coherenceMetrics: {
    averageRelevance: number; // Average similarity for control-based requirements
    highConfidenceCount: number; // Count of high confidence (>0.7) mappings
    mediumConfidenceCount: number; // Count of medium confidence (0.5-0.7) mappings
    lowConfidenceCount: number; // Count of low confidence (<0.5) mappings
    overallCoherence: number; // Percentage of control-based with high confidence
  };
  computedAt: Date;
  version: string; // Same as ruleVersion for consistency
  createdAt: Date;
  updatedAt: Date;
}

const NLPSimilaritySchema = new Schema<INLPSimilarity>({
  requirementId: { type: String, required: true },
  similarity: { type: Number, required: true, min: 0, max: 1 },
  isControlBased: { type: Boolean, required: true },
  confidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true,
  },
}, { _id: false });

const QuestionMappingSchema = new Schema<IQuestionMapping>(
  {
    questionId: {
      type: String,
      required: true,
    },
    ruleVersion: {
      type: String,
      required: true,
    },
    regulationType: {
      type: String,
      enum: ['DORA', 'CHILEAN_PRIVACY'],
    },
    controlBasedRequirements: [String],
    nlpSimilarities: [NLPSimilaritySchema],
    coherenceMetrics: {
      averageRelevance: { type: Number, default: 0 },
      highConfidenceCount: { type: Number, default: 0 },
      mediumConfidenceCount: { type: Number, default: 0 },
      lowConfidenceCount: { type: Number, default: 0 },
      overallCoherence: { type: Number, default: 0 },
    },
    computedAt: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    validateBeforeSave: false,
  }
);

// Compound index for fast lookups
QuestionMappingSchema.index({ questionId: 1, ruleVersion: 1 }, { unique: true });

// Export model with local storage fallback
let QuestionMappingModel: any;

if (isLocalStorage()) {
  QuestionMappingModel = new LocalModel<IQuestionMapping>('QuestionMapping');
} else {
  QuestionMappingModel = mongoose.models.QuestionMapping || 
    mongoose.model<IQuestionMapping>('QuestionMapping', QuestionMappingSchema);
}

export default QuestionMappingModel;

/** Returns regulation-scoped model for local storage (separate file per regulation); same model for MongoDB. */
export function getQuestionMappingModel(regulation?: string) {
  if (isLocalStorage()) {
    return new LocalModel<IQuestionMapping>('QuestionMapping', regulation || 'DORA');
  }
  return QuestionMappingModel;
}

