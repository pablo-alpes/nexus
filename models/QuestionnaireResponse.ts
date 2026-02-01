import mongoose, { Schema, Document, Types } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export interface IAnswer {
  questionId: Types.ObjectId;
  value: string | string[] | number | boolean;
  textValue?: string;
}

export interface IQuestionnaireResponse extends Document {
  userId: Types.ObjectId;
  answers: IAnswer[];
  applicableControls: Types.ObjectId[]; // Controls determined to be applicable
  controlReasoning?: Record<string, string[]>; // Reasoning for each control (transparency)
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  value: Schema.Types.Mixed,
  textValue: String,
}, { _id: false });

const QuestionnaireResponseSchema = new Schema<IQuestionnaireResponse>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: [AnswerSchema],
    applicableControls: [{
      type: Schema.Types.Mixed, // Mixed for local storage
      ref: 'Control',
    }],
    controlReasoning: {
      type: Map,
      of: [String], // Array of reasoning strings per control ID
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let QuestionnaireResponseModel: any;

if (isLocalStorage()) {
  QuestionnaireResponseModel = new LocalModel<IQuestionnaireResponse>('QuestionnaireResponse');
} else {
  QuestionnaireResponseModel = mongoose.models.QuestionnaireResponse || 
    mongoose.model<IQuestionnaireResponse>('QuestionnaireResponse', QuestionnaireResponseSchema);
}

export default QuestionnaireResponseModel;

