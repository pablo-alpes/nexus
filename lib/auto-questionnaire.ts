/**
 * Auto-setup questionnaire - creates questions if none exist
 */

import { connectDBLocal } from './mongodb-local';
import Question from '@/models/Question';
import DORARequirement from '@/models/DORARequirement';
import fs from 'fs';
import path from 'path';

let questionnaireSetupCompleted = false;
let questionnaireSetupInProgress = false;

// Export function to reset setup flag (for testing/recovery)
export function resetQuestionnaireSetupFlag() {
  questionnaireSetupCompleted = false;
  questionnaireSetupInProgress = false;
}

export async function ensureQuestionnaireSetup(): Promise<void> {
  if (questionnaireSetupInProgress) {
    return;
  }

  try {
    await connectDBLocal();
    
    // Simple check: if questions exist and setup was completed, skip
    const questionCount = await Question.countDocuments();
    if (questionCount > 0 && questionnaireSetupCompleted) {
      console.log(`✅ Questions already exist (${questionCount} questions), skipping setup`);
      return;
    }
    
    // If questions exist but setup not completed, just mark as completed
    if (questionCount > 0) {
      console.log(`✅ Questions already exist (${questionCount} questions), marking setup as completed`);
      questionnaireSetupCompleted = true;
      return;
    }
    
    // If we get here, either no questions exist or they were all removed
    // Create questions
    questionnaireSetupInProgress = true;
    console.log('No questions found, creating DORA questionnaire...');
    
    // Create questions directly
    await createQuestionsDirectly();
    
    questionnaireSetupCompleted = true;
    questionnaireSetupInProgress = false;
  } catch (error: any) {
    console.error('Questionnaire setup failed:', error.message);
    questionnaireSetupInProgress = false;
  }
}

async function createQuestionsDirectly() {
  const questionnaireStructure = [
    {
      pillar: 'ICT_RISK_MANAGEMENT',
      questions: [
        { questionId: 'Q-ICT-001', text: 'Do you have an ICT risk management framework in place?', order: 1 },
        { questionId: 'Q-ICT-002', text: 'Do you have documented ICT risk management policies and procedures?', order: 2 },
        { questionId: 'Q-ICT-003', text: 'Do you perform regular ICT risk assessments?', order: 3 },
        { questionId: 'Q-ICT-004', text: 'Do you have a process for identifying and managing ICT vulnerabilities?', order: 4 },
        { questionId: 'Q-ICT-005', text: 'Do you have business continuity and disaster recovery plans?', order: 5 },
        { questionId: 'Q-ICT-006', text: 'Do you have a process for managing ICT security incidents?', order: 6 },
      ],
    },
    {
      pillar: 'INCIDENT_MANAGEMENT',
      questions: [
        { questionId: 'Q-INC-001', text: 'Do you have an ICT incident management framework?', order: 1 },
        { questionId: 'Q-INC-002', text: 'Do you have procedures for detecting ICT incidents?', order: 2 },
        { questionId: 'Q-INC-003', text: 'Do you have procedures for reporting ICT incidents to competent authorities?', order: 3 },
        { questionId: 'Q-INC-004', text: 'Do you maintain an ICT incident log?', order: 4 },
        { questionId: 'Q-INC-005', text: 'Do you have procedures for post-incident review and lessons learned?', order: 5 },
      ],
    },
    {
      pillar: 'RESILIENCE_TESTING',
      questions: [
        { questionId: 'Q-TEST-001', text: 'Do you perform regular ICT resilience testing?', order: 1 },
        { questionId: 'Q-TEST-002', text: 'Do you perform vulnerability assessments and penetration testing?', order: 2 },
        { questionId: 'Q-TEST-003', text: 'Do you perform scenario-based testing (e.g., cyber attack simulations)?', order: 3 },
        { questionId: 'Q-TEST-004', text: 'Do you have a testing schedule and documented test results?', order: 4 },
        { questionId: 'Q-TEST-005', text: 'Do you test your business continuity and disaster recovery plans?', order: 5 },
      ],
    },
    {
      pillar: 'THIRD_PARTY_RISK',
      questions: [
        { questionId: 'Q-TP-001', text: 'Do you use ICT third-party service providers?', order: 1 },
        { questionId: 'Q-TP-002', text: 'Do you have a process for assessing third-party ICT risks?', order: 2 },
        { questionId: 'Q-TP-003', text: 'Do you have contractual agreements with third-party ICT providers?', order: 3 },
        { questionId: 'Q-TP-004', text: 'Do you monitor and review third-party ICT service providers?', order: 4 },
        { questionId: 'Q-TP-005', text: 'Do you have exit strategies for critical third-party ICT services?', order: 5 },
      ],
    },
    {
      pillar: 'INFORMATION_SHARING',
      questions: [
        { questionId: 'Q-INFO-001', text: 'Do you participate in information-sharing arrangements on cyber threats?', order: 1 },
        { questionId: 'Q-INFO-002', text: 'Do you share cyber threat intelligence with other financial entities?', order: 2 },
        { questionId: 'Q-INFO-003', text: 'Do you notify competent authorities of your participation in information-sharing arrangements?', order: 3 },
      ],
    },
  ];

  // Get requirements for mapping
  const allRequirements = await DORARequirement.find();
  let globalOrder = 1;

  for (const pillarGroup of questionnaireStructure) {
    for (const questionData of pillarGroup.questions) {
      // Check if question already exists by questionId
      const existingById = await Question.findOne({ questionId: questionData.questionId });
      if (existingById) {
        console.log(`⏭️  Question ${questionData.questionId} already exists, skipping...`);
        continue;
      }
      
      // Also check if question with same text already exists (prevent duplicates)
      const existingByText = await Question.findOne({ 
        text: questionData.text,
        pillar: pillarGroup.pillar 
      });
      if (existingByText) {
        console.log(`⏭️  Question with same text already exists, skipping: "${questionData.text.substring(0, 50)}..."`);
        continue;
      }

      // Find related requirements
      const relatedRequirements = allRequirements.filter(req => {
        const text = `${req.description || ''} ${req.title || ''}`.toLowerCase();
        const keywords = questionData.text.toLowerCase().split(' ').filter(w => w.length > 3);
        return keywords.some(keyword => text.includes(keyword)) && req.pillar === pillarGroup.pillar;
      });

      await Question.create({
        questionId: questionData.questionId,
        text: questionData.text,
        type: 'YES_NO',
        options: [
          {
            value: 'yes',
            label: 'Yes',
            applicableControls: relatedRequirements.map(r => r._id || r.requirementId).slice(0, 20),
          },
          {
            value: 'no',
            label: 'No',
          },
          {
            value: 'not_applicable',
            label: 'Not Applicable',
          },
        ],
        pillar: pillarGroup.pillar,
        order: globalOrder++,
        isRequired: true,
      });
    }
  }

  console.log(`✅ Created questionnaire questions`);
}

