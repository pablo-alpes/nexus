/**
 * Create simple DORA questionnaire - standalone version
 */

const fs = require('fs');
const path = require('path');

// Simple local storage functions
const DATA_DIR = path.join(__dirname, '../data/local-db');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getCollectionPath(collectionName) {
  ensureDataDir();
  return path.join(DATA_DIR, `${collectionName}.json`);
}

function readCollection(collectionName) {
  const filePath = getCollectionPath(collectionName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
}

function writeCollection(collectionName, data) {
  const filePath = getCollectionPath(collectionName);
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Questionnaire structure
const questionnaireStructure = [
  {
    pillar: 'ICT_RISK_MANAGEMENT',
    title: 'ICT Risk Management',
    questions: [
      {
        questionId: 'Q-ICT-001',
        text: 'Do you have an ICT risk management framework in place?',
        order: 1,
      },
      {
        questionId: 'Q-ICT-002',
        text: 'Do you have documented ICT risk management policies and procedures?',
        order: 2,
      },
      {
        questionId: 'Q-ICT-003',
        text: 'Do you perform regular ICT risk assessments?',
        order: 3,
      },
      {
        questionId: 'Q-ICT-004',
        text: 'Do you have a process for identifying and managing ICT vulnerabilities?',
        order: 4,
      },
      {
        questionId: 'Q-ICT-005',
        text: 'Do you have business continuity and disaster recovery plans?',
        order: 5,
      },
      {
        questionId: 'Q-ICT-006',
        text: 'Do you have a process for managing ICT security incidents?',
        order: 6,
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
      },
      {
        questionId: 'Q-INC-002',
        text: 'Do you have procedures for detecting ICT incidents?',
        order: 2,
      },
      {
        questionId: 'Q-INC-003',
        text: 'Do you have procedures for reporting ICT incidents to competent authorities?',
        order: 3,
      },
      {
        questionId: 'Q-INC-004',
        text: 'Do you maintain an ICT incident log?',
        order: 4,
      },
      {
        questionId: 'Q-INC-005',
        text: 'Do you have procedures for post-incident review and lessons learned?',
        order: 5,
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
      },
      {
        questionId: 'Q-TEST-002',
        text: 'Do you perform vulnerability assessments and penetration testing?',
        order: 2,
      },
      {
        questionId: 'Q-TEST-003',
        text: 'Do you perform scenario-based testing (e.g., cyber attack simulations)?',
        order: 3,
      },
      {
        questionId: 'Q-TEST-004',
        text: 'Do you have a testing schedule and documented test results?',
        order: 4,
      },
      {
        questionId: 'Q-TEST-005',
        text: 'Do you test your business continuity and disaster recovery plans?',
        order: 5,
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
      },
      {
        questionId: 'Q-TP-002',
        text: 'Do you have a process for assessing third-party ICT risks?',
        order: 2,
      },
      {
        questionId: 'Q-TP-003',
        text: 'Do you have contractual agreements with third-party ICT providers?',
        order: 3,
      },
      {
        questionId: 'Q-TP-004',
        text: 'Do you monitor and review third-party ICT service providers?',
        order: 4,
      },
      {
        questionId: 'Q-TP-005',
        text: 'Do you have exit strategies for critical third-party ICT services?',
        order: 5,
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
      },
      {
        questionId: 'Q-INFO-002',
        text: 'Do you share cyber threat intelligence with other financial entities?',
        order: 2,
      },
      {
        questionId: 'Q-INFO-003',
        text: 'Do you notify competent authorities of your participation in information-sharing arrangements?',
        order: 3,
      },
    ],
  },
];

async function createDORAQuestionnaire() {
  try {
    console.log('🚀 Creating DORA questionnaire...\n');

    // Get existing questions
    const existingQuestions = readCollection('Question');
    const existingQuestionIds = new Set(existingQuestions.map(q => q.questionId));

    // Get requirements to map
    const requirements = readCollection('DORARequirement');
    console.log(`Found ${requirements.length} requirements to map\n`);

    const createdQuestions = [];
    let questionOrder = 1;

    for (const pillarGroup of questionnaireStructure) {
      console.log(`📋 Creating questions for ${pillarGroup.title}...`);

      for (const questionData of pillarGroup.questions) {
        // Skip if already exists
        if (existingQuestionIds.has(questionData.questionId)) {
          console.log(`⏭️  Question ${questionData.questionId} already exists, skipping...`);
          continue;
        }

        // Find related requirements
        const relatedRequirements = requirements.filter(req => {
          const text = `${req.description || ''} ${req.title || ''} ${req.legalText || ''}`.toLowerCase();
          const keywords = questionData.text.toLowerCase().split(' ');
          return keywords.some(keyword => 
            keyword.length > 3 && text.includes(keyword)
          ) && req.pillar === pillarGroup.pillar;
        });

        const question = {
          _id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          questionId: questionData.questionId,
          text: questionData.text,
          type: 'YES_NO',
          options: [
            {
              value: 'yes',
              label: 'Yes',
              applicableControls: relatedRequirements.map(r => r._id || r.requirementId).slice(0, 10), // Limit to avoid too many
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
          order: questionOrder++,
          isRequired: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        existingQuestions.push(question);
        createdQuestions.push({
          questionId: question.questionId,
          text: question.text,
          pillar: pillarGroup.pillar,
          requirementsMapped: relatedRequirements.length,
        });

        console.log(`✅ Created ${questionData.questionId}: ${questionData.text.substring(0, 60)}... (${relatedRequirements.length} requirements)`);
      }
      console.log('');
    }

    // Save all questions
    writeCollection('Question', existingQuestions);

    console.log(`✨ Created ${createdQuestions.length} questions`);
    console.log(`📊 Breakdown:`);
    const pillarCounts = createdQuestions.reduce((acc, q) => {
      acc[q.pillar] = (acc[q.pillar] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(pillarCounts).forEach(([pillar, count]) => {
      console.log(`   ${pillar}: ${count} questions`);
    });

    return {
      created: createdQuestions.length,
      questions: createdQuestions,
    };
  } catch (error) {
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

