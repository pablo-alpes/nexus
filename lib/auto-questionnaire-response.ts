/**
 * Auto-setup mock questionnaire responses
 */

import { connectDBLocal } from './mongodb-local';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import Question from '@/models/Question';
import Control from '@/models/Control';
import { getTestUser } from './test-mode';

let mockResponseSetupCompleted = false;
let mockResponseSetupInProgress = false;

export async function ensureMockQuestionnaireResponse(): Promise<void> {
  if (mockResponseSetupInProgress || mockResponseSetupCompleted) {
    return;
  }

  try {
    await connectDBLocal();
    
    const testUser = getTestUser();
    const userId = String(testUser.userId);
    
    // Check if response already exists
    const existing = await QuestionnaireResponse.findOne({ userId });
    if (existing) {
      mockResponseSetupCompleted = true;
      return;
    }

    mockResponseSetupInProgress = true;
    console.log('Creating mock questionnaire response...');
    
    await createMockQuestionnaireResponse();
    
    mockResponseSetupCompleted = true;
    mockResponseSetupInProgress = false;
    console.log('✅ Mock questionnaire response created!');
  } catch (error: any) {
    console.error('Mock questionnaire response setup failed:', error.message);
    mockResponseSetupInProgress = false;
  }
}

async function createMockQuestionnaireResponse(): Promise<void> {
  const testUser = getTestUser();
  const userId = String(testUser.userId);
  
  // Get all questions
  const questions = await Question.find();
  const sortedQuestions = questions.sort((a, b) => a.order - b.order);
  
  // Get all controls for mapping
  const allControls = await Control.find();
  
  // Create mock answers - mix of yes, no, and not_applicable
  const answers = [];
  const applicableControlIds = new Set<string>();
  
  for (let i = 0; i < sortedQuestions.length; i++) {
    const question = sortedQuestions[i];
    
    // Determine answer based on question type and pillar
    let answerValue: string;
    
    // Mock logic: Answer "yes" to ~60% of questions, "no" to ~30%, "not_applicable" to ~10%
    const random = Math.random();
    if (random < 0.6) {
      answerValue = 'yes';
    } else if (random < 0.9) {
      answerValue = 'no';
    } else {
      answerValue = 'not_applicable';
    }
    
    // Ensure some strategic "yes" answers for key questions
    if (question.questionId?.includes('ICT-001') || 
        question.questionId?.includes('ICT-002') ||
        question.questionId?.includes('TP-001')) {
      answerValue = 'yes'; // Always yes for key framework questions
    }
    
    answers.push({
      questionId: String(question._id),
      value: answerValue,
    });
    
    // If answered "yes", add applicable controls
    if (answerValue === 'yes') {
      // Get controls from question options
      if (question.options) {
        const yesOption = question.options.find(o => o.value === 'yes');
        if (yesOption && yesOption.applicableControls) {
          yesOption.applicableControls.forEach((controlId: any) => {
            applicableControlIds.add(String(controlId));
          });
        }
      }
      
      // Also add all controls for this pillar
      if (question.pillar) {
        const pillarControls = allControls.filter(c => c.pillar === question.pillar);
        pillarControls.forEach(c => {
          applicableControlIds.add(String(c._id || c.controlId));
        });
      }
    }
  }
  
  // Create response
  const responseData = {
    userId: userId,
    answers: answers,
    applicableControls: Array.from(applicableControlIds),
    completedAt: new Date().toISOString(),
  };
  
  await QuestionnaireResponse.findOneAndUpdate(
    { userId },
    responseData,
    { upsert: true, new: true }
  );
  
  console.log(`✅ Created mock questionnaire response with ${answers.length} answers`);
  console.log(`   Applicable controls: ${applicableControlIds.size}`);
}
