import mongoose, { Schema, Document, Types } from 'mongoose';
import { isLocalStorage } from '@/lib/mongodb-local';
import { LocalModel } from './LocalModel';

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  YES_NO = 'YES_NO',
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
}

export interface IQuestionOption {
  value: string;
  label: string;
  nextQuestionId?: Types.ObjectId; // For conditional flow
  applicableControls?: Types.ObjectId[]; // Controls that become applicable if this option is selected
}

export interface IQuestion extends Document {
  questionId: string;
  text: string;
  type: QuestionType;
  options?: IQuestionOption[];
  pillar?: string; // DORA Pillar this question relates to
  regulationType?: string; // DORA | CHILEAN_PRIVACY - for filtering and separate persistence
  order: number;
  isRequired: boolean;
  parentQuestionId?: Types.ObjectId; // For conditional questions
  createdAt: Date;
  updatedAt: Date;
}

const QuestionOptionSchema = new Schema<IQuestionOption>({
  value: { type: String, required: true },
  label: { type: String, required: true },
  nextQuestionId: { type: Schema.Types.ObjectId, ref: 'Question' },
  applicableControls: [{ type: Schema.Types.ObjectId, ref: 'Control' }],
}, { _id: false });

const QuestionSchema = new Schema<IQuestion>(
  {
    questionId: {
      type: String,
      required: true,
      unique: true,
    },
    text: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(QuestionType),
      required: true,
    },
    options: [QuestionOptionSchema],
    pillar: {
      type: String,
    },
    regulationType: {
      type: String,
      enum: ['DORA', 'CHILEAN_PRIVACY'],
    },
    order: {
      type: Number,
      required: true,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    parentQuestionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
    },
  },
  {
    timestamps: true,
  }
);

// Export model with local storage fallback
let QuestionModel: any;

if (isLocalStorage()) {
  QuestionModel = new LocalModel<IQuestion>('Question');
} else {
  QuestionModel = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
}

export default QuestionModel;

/** Returns regulation-scoped model for local storage (separate file per regulation); same model for MongoDB. */
export function getQuestionModel(regulation?: string) {
  if (isLocalStorage()) {
    return new LocalModel<IQuestion>('Question', regulation || 'DORA');
  }
  return QuestionModel;
}

