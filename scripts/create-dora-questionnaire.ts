/**
 * Create simple DORA questionnaire based on requirements
 * Questions are Yes/No/Not Applicable
 */

import { connectDBLocal } from '../lib/mongodb-local';
import Question from '../models/Question';
import DORARequirement from '../models/DORARequirement';

// Group requirements by pillar and create simple questions
const questionnaireStructure = [
  {
    pillar: 'ICT_RISK_MANAGEMENT',
    title: 'ICT Risk Management',
    questions: [
      {
        questionId: 'Q-ICT-001',
        text: 'Do you have an ICT risk management framework in place?',
        order: 1,
        requirementKeywords: ['risk management', 'framework', 'ICT risk'],
      },
      {
        questionId: 'Q-ICT-002',
        text: 'Do you have documented ICT risk management policies and procedures?',
        order: 2,
        requirementKeywords: ['policies', 'procedures', 'documented'],
      },
      {
        questionId: 'Q-ICT-003',
        text: 'Do you perform regular ICT risk assessments?',
        order: 3,
        requirementKeywords: ['risk assessment', 'assessment'],
      },
      {
        questionId: 'Q-ICT-004',
        text: 'Do you have a process for identifying and managing ICT vulnerabilities?',
        order: 4,
        requirementKeywords: ['vulnerability', 'vulnerabilities'],
      },
      {
        questionId: 'Q-ICT-005',
        text: 'Do you have business continuity and disaster recovery plans?',
        order: 5,
        requirementKeywords: ['business continuity', 'disaster recovery', 'continuity'],
      },
      {
        questionId: 'Q-ICT-006',
        text: 'Do you have a process for managing ICT security incidents?',
        order: 6,
        requirementKeywords: ['security incident', 'incident management'],
      },
    ],
  },
  {
    pillar: 'INCIDENT_MANAGEMENT',
    title: 'ICT-Related Incident Management',
    questions: [
      {
        questionId: 'Q-INC-001',
        text: 'Do you have an ICT incident management framework?',
        order: 1,
        requirementKeywords: ['incident', 'incident management'],
      },
      {
        questionId: 'Q-INC-002',
        text: 'Do you have procedures for detecting ICT incidents?',
        order: 2,
        requirementKeywords: ['detect', 'detection', 'incident'],
      },
      {
        questionId: 'Q-INC-003',
        text: 'Do you have procedures for reporting ICT incidents to competent authorities?',
        order: 3,
        requirementKeywords: ['report', 'reporting', 'authorities', 'competent'],
      },
      {
        questionId: 'Q-INC-004',
        text: 'Do you maintain an ICT incident log?',
        order: 4,
        requirementKeywords: ['log', 'incident log', 'logging'],
      },
      {
        questionId: 'Q-INC-005',
        text: 'Do you have procedures for post-incident review and lessons learned?',
        order: 5,
        requirementKeywords: ['post-incident', 'review', 'lessons learned'],
      },
    ],
  },
  {
    pillar: 'RESILIENCE_TESTING',
    title: 'Digital Operational Resilience Testing',
    questions: [
      {
        questionId: 'Q-TEST-001',
        text: 'Do you perform regular ICT resilience testing?',
        order: 1,
        requirementKeywords: ['testing', 'resilience testing', 'test'],
      },
      {
        questionId: 'Q-TEST-002',
        text: 'Do you perform vulnerability assessments and penetration testing?',
        order: 2,
        requirementKeywords: ['penetration', 'vulnerability assessment', 'pen test'],
      },
      {
        questionId: 'Q-TEST-003',
        text: 'Do you perform scenario-based testing (e.g., cyber attack simulations)?',
        order: 3,
        requirementKeywords: ['scenario', 'simulation', 'cyber attack'],
      },
      {
        questionId: 'Q-TEST-004',
        text: 'Do you have a testing schedule and documented test results?',
        order: 4,
        requirementKeywords: ['schedule', 'test results', 'documented'],
      },
      {
        questionId: 'Q-TEST-005',
        text: 'Do you test your business continuity and disaster recovery plans?',
        order: 5,
        requirementKeywords: ['business continuity test', 'disaster recovery test'],
      },
    ],
  },
  {
    pillar: 'THIRD_PARTY_RISK',
    title: 'ICT Third-Party Risk Management',
    questions: [
      {
        questionId: 'Q-TP-001',
        text: 'Do you use ICT third-party service providers?',
        order: 1,
        requirementKeywords: ['third party', 'third-party', 'service provider'],
      },
      {
        questionId: 'Q-TP-002',
        text: 'Do you have a process for assessing third-party ICT risks?',
        order: 2,
        requirementKeywords: ['third party risk', 'assessment', 'third-party'],
      },
      {
        questionId: 'Q-TP-003',
        text: 'Do you have contractual agreements with third-party ICT providers?',
        order: 3,
        requirementKeywords: ['contract', 'agreement', 'third party'],
      },
      {
        questionId: 'Q-TP-004',
        text: 'Do you monitor and review third-party ICT service providers?',
        order: 4,
        requirementKeywords: ['monitor', 'review', 'third party'],
      },
      {
        questionId: 'Q-TP-005',
        text: 'Do you have exit strategies for critical third-party ICT services?',
        order: 5,
        requirementKeywords: ['exit', 'exit strategy', 'third party'],
      },
    ],
  },
  {
    pillar: 'INFORMATION_SHARING',
    title: 'Information Sharing',
    questions: [
      {
        questionId: 'Q-INFO-001',
        text: 'Do you participate in information-sharing arrangements on cyber threats?',
        order: 1,
        requirementKeywords: ['information sharing', 'cyber threat', 'sharing'],
      },
      {
        questionId: 'Q-INFO-002',
        text: 'Do you share cyber threat intelligence with other financial entities?',
        order: 2,
        requirementKeywords: ['threat intelligence', 'share', 'cyber threat'],
      },
      {
        questionId: 'Q-INFO-003',
        text: 'Do you notify competent authorities of your participation in information-sharing arrangements?',
        order: 3,
        requirementKeywords: ['notify', 'authorities', 'participation'],
      },
    ],
  },
];

export async function createDORAQuestionnaire() {
  try {
    await connectDBLocal();
    
    console.log('🚀 Creating DORA questionnaire...\n');

    // Get all requirements to map to questions
    const allRequirements = await DORARequirement.find();
    console.log(`Found ${allRequirements.length} requirements to map\n`);

    const createdQuestions = [];
    const errors = [];

    for (const pillarGroup of questionnaireStructure) {
      console.log(`📋 Creating questions for ${pillarGroup.title}...`);

      for (const questionData of pillarGroup.questions) {
        try {
          // Find related requirements based on keywords
          const relatedRequirements = allRequirements.filter(req => {
            const text = `${req.description} ${req.title} ${req.legalText}`.toLowerCase();
            return questionData.requirementKeywords.some(keyword => 
              text.includes(keyword.toLowerCase())
            ) && req.pillar === pillarGroup.pillar;
          });

          // Check if question already exists
          const existing = await Question.findOne({ questionId: questionData.questionId });
          
          if (existing) {
            console.log(`⏭️  Question ${questionData.questionId} already exists, skipping...`);
            continue;
          }

          const question = await Question.create({
            questionId: questionData.questionId,
            text: questionData.text,
            type: 'YES_NO',
            options: [
              {
                value: 'yes',
                label: 'Yes',
                applicableControls: relatedRequirements.map(r => r._id || r.requirementId),
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
            order: questionData.order,
            isRequired: true,
          });

          createdQuestions.push({
            questionId: question.questionId,
            text: question.text,
            pillar: pillarGroup.pillar,
            requirementsMapped: relatedRequirements.length,
          });

          console.log(`✅ Created ${questionData.questionId}: ${questionData.text.substring(0, 60)}... (${relatedRequirements.length} requirements)`);
        } catch (error: any) {
          errors.push({ questionId: questionData.questionId, error: error.message });
          console.error(`❌ Failed to create ${questionData.questionId}:`, error.message);
        }
      }
      console.log('');
    }

    console.log(`✨ Created ${createdQuestions.length} questions`);
    console.log(`📊 Breakdown:`);
    const pillarCounts = createdQuestions.reduce((acc, q) => {
      acc[q.pillar] = (acc[q.pillar] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(pillarCounts).forEach(([pillar, count]) => {
      console.log(`   ${pillar}: ${count} questions`);
    });
    
    if (errors.length > 0) {
      console.warn(`\n⚠️  ${errors.length} questions failed to create`);
    }

    return {
      created: createdQuestions.length,
      errors: errors.length,
      questions: createdQuestions,
    };
  } catch (error: any) {
    console.error('❌ Error creating questionnaire:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createDORAQuestionnaire()
    .then(result => {
      console.log('\n🎉 Questionnaire setup complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to create questionnaire:', error);
      process.exit(1);
    });
}

module.exports = { createDORAQuestionnaire };

