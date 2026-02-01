/**
 * Chilean Privacy Matching Engine Flow Test
 * 
 * Tests the complete flow: Questionnaire → Requirements → Controls → Assets → Gap Analysis
 * For Chilean Privacy Law (Ley 21.719)
 * 
 * Usage: node scripts/test-chilean-privacy-engine-flow.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/local-db');
const ISO27701_CONTROLS_PATH = path.join(__dirname, '../data/iso27701-controls.json');

const CHILEAN_PRIVACY_PILLARS = [
  'LAWFULNESS_FAIRNESS',
  'PURPOSE_LIMITATION',
  'DATA_MINIMIZATION',
  'PROPORTIONALITY',
  'QUALITY',
  'ACCOUNTABILITY',
  'SECURITY',
  'TRANSPARENCY_CONFIDENTIALITY',
];

function readCollection(collectionName) {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${collectionName}:`, error.message);
    return [];
  }
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function logSubsection(title) {
  console.log('\n' + '-'.repeat(60));
  console.log(title);
  console.log('-'.repeat(60));
}

async function testChileanPrivacyEngineFlow() {
  console.log('\n🧪 Chilean Privacy Matching Engine Flow Test');
  console.log('Testing: Assets → Questionnaire → Requirements → Controls → Gap Analysis\n');

  const testUserId = 'test-chilean-privacy-user';
  let errors = [];
  let warnings = [];

  try {
    // ========================================================================
    // STEP 1: Load Test Data
    // ========================================================================
    logSection('STEP 1: Loading Test Data');

    const allQuestions = readCollection('Question');
    const allRequirements = readCollection('Requirement');
    const allControls = readCollection('Control');
    const assets = readCollection('Asset').filter(a => a.userId === testUserId);
    const questionnaireResponses = readCollection('QuestionnaireResponse').filter(r => r.userId === testUserId);
    const questionMappings = readCollection('QuestionMapping');

    // Filter for Chilean Privacy
    const questions = allQuestions.filter(q => 
      q.questionId?.startsWith('Q-PRIV-') || 
      CHILEAN_PRIVACY_PILLARS.includes(q.pillar)
    );
    
    const requirements = allRequirements.filter(r => 
      r.regulationType === 'CHILEAN_PRIVACY' ||
      r.requirementId?.startsWith('CHILE-REQ-')
    );

    const controls = allControls.filter(c => 
      CHILEAN_PRIVACY_PILLARS.includes(c.pillar)
    );

    // Load ISO 27701 controls
    let iso27701Controls = [];
    if (fs.existsSync(ISO27701_CONTROLS_PATH)) {
      const isoData = JSON.parse(fs.readFileSync(ISO27701_CONTROLS_PATH, 'utf8'));
      iso27701Controls = isoData.controls || [];
    }

    console.log(`✅ Chilean Privacy Questions: ${questions.length}`);
    console.log(`✅ Chilean Privacy Requirements: ${requirements.length}`);
    console.log(`✅ Controls: ${controls.length}`);
    console.log(`✅ ISO 27701 Controls: ${iso27701Controls.length}`);
    console.log(`✅ Assets: ${assets.length}`);
    console.log(`✅ Questionnaire Responses: ${questionnaireResponses.length}`);

    if (questions.length === 0) {
      throw new Error('No Chilean Privacy questions found! Run create-chilean-privacy-questionnaire.js first.');
    }
    if (requirements.length === 0) {
      throw new Error('No Chilean Privacy requirements found! Run import-chilean-privacy-requirements.js first.');
    }
    if (controls.length === 0 && iso27701Controls.length === 0) {
      warnings.push('No controls found for Chilean Privacy pillars. Controls may need to be created.');
    }

    // ========================================================================
    // STEP 2: Analyze Questionnaire Response
    // ========================================================================
    logSection('STEP 2: Analyzing Questionnaire Response');

    if (questionnaireResponses.length === 0) {
      warnings.push('No questionnaire response found. Create one first to test the flow.');
      console.log('⚠️  No questionnaire response found');
    } else {
      const response = questionnaireResponses[0];
      console.log(`📋 Questionnaire Response ID: ${response._id}`);
      console.log(`   Answers: ${response.answers?.length || 0}`);
      console.log(`   Applicable Controls: ${response.applicableControls?.length || 0}`);
      console.log(`   Completed At: ${response.completedAt || 'N/A'}`);

      // Analyze answers
      const yesAnswers = response.answers?.filter(a => a.value === 'yes') || [];
      const noAnswers = response.answers?.filter(a => a.value === 'no') || [];
      const naAnswers = response.answers?.filter(a => a.value === 'not_applicable') || [];

      console.log(`\n   Answer Breakdown:`);
      console.log(`     Yes: ${yesAnswers.length}`);
      console.log(`     No: ${noAnswers.length}`);
      console.log(`     Not Applicable: ${naAnswers.length}`);

      // Analyze by pillar
      const answersByPillar = {};
      CHILEAN_PRIVACY_PILLARS.forEach(pillar => {
        const pillarAnswers = response.answers?.filter(a => {
          const q = questions.find(qq => qq.questionId === a.questionId);
          return q && q.pillar === pillar;
        }) || [];
        answersByPillar[pillar] = pillarAnswers;
      });

      logSubsection('Answers by Pillar');
      CHILEAN_PRIVACY_PILLARS.forEach(pillar => {
        const pillarAnswers = answersByPillar[pillar] || [];
        const noCount = pillarAnswers.filter(a => a.value === 'no').length;
        console.log(`   ${pillar}: ${pillarAnswers.length} answers (${noCount} "No" answers)`);
      });

      // ========================================================================
      // STEP 3: Test Question → Requirement Mapping
      // ========================================================================
      logSection('STEP 3: Question → Requirement Mapping');

      const noAnswerQuestionIds = new Set(noAnswers.map(a => a.questionId));
      const requirementsFromQuestions = new Set();
      const requirementsNotFound = [];

      for (const noAnswer of noAnswers) {
        const question = questions.find(q => q.questionId === noAnswer.questionId);
        if (!question) continue;

        const mapping = questionMappings.find(m => m.questionId === question.questionId);
        if (mapping && mapping.controlBasedRequirements) {
          mapping.controlBasedRequirements.forEach(reqId => {
            requirementsFromQuestions.add(reqId);
          });
        } else {
          warnings.push(`Question ${question.questionId} has no precomputed mapping`);
        }
      }

      console.log(`\n   Questions with "No" answers: ${noAnswers.length}`);
      console.log(`   Requirements identified: ${requirementsFromQuestions.size}`);

      // Verify requirements exist
      for (const reqId of requirementsFromQuestions) {
        const req = requirements.find(r => 
          r.requirementId === reqId || 
          String(r._id) === reqId
        );
        if (!req) {
          requirementsNotFound.push(reqId);
        }
      }

      if (requirementsNotFound.length > 0) {
        errors.push(`${requirementsNotFound.length} requirements from mappings not found in database`);
        console.log(`\n   ⚠️  Requirements not found: ${requirementsNotFound.slice(0, 5).join(', ')}`);
      } else {
        console.log(`   ✅ All requirements from mappings exist in database`);
      }

      // ========================================================================
      // STEP 4: Test Requirement → Control Mapping
      // ========================================================================
      logSection('STEP 4: Requirement → Control Mapping');

      const controlsFromRequirements = new Set();
      const controlsFromResponse = new Set(response.applicableControls || []);

      // Get controls from requirements
      for (const reqId of requirementsFromQuestions) {
        const req = requirements.find(r => 
          r.requirementId === reqId || 
          String(r._id) === reqId
        );
        if (!req) continue;

        // Check database controls
        const dbControls = controls.filter(c => {
          if (!c.requirementIds || !Array.isArray(c.requirementIds)) return false;
          return c.requirementIds.some(rId => 
            String(rId) === String(req._id) || 
            String(rId) === reqId
          );
        });

        dbControls.forEach(c => {
          controlsFromRequirements.add(String(c._id || c.controlId));
        });

        // Check ISO 27701 controls
        const isoControls = iso27701Controls.filter(c => {
          if (c.chileRequirements && Array.isArray(c.chileRequirements)) {
            return c.chileRequirements.includes(reqId);
          }
          return false;
        });

        isoControls.forEach(c => {
          controlsFromRequirements.add(c.controlId);
        });
      }

      console.log(`\n   Controls from requirements: ${controlsFromRequirements.size}`);
      console.log(`   Controls in response: ${controlsFromResponse.size}`);

      // Compare
      const missingInResponse = [];
      const extraInResponse = [];

      controlsFromRequirements.forEach(controlId => {
        if (!controlsFromResponse.has(controlId)) {
          missingInResponse.push(controlId);
        }
      });

      controlsFromResponse.forEach(controlId => {
        if (!controlsFromRequirements.has(controlId)) {
          extraInResponse.push(controlId);
        }
      });

      if (missingInResponse.length > 0) {
        warnings.push(`${missingInResponse.length} controls from requirements not in response`);
        console.log(`\n   ⚠️  Missing controls: ${missingInResponse.slice(0, 5).join(', ')}`);
      }

      if (extraInResponse.length > 0) {
        warnings.push(`${extraInResponse.length} controls in response not from requirements`);
      }

      // ========================================================================
      // STEP 5: Test Control → Asset Mapping
      // ========================================================================
      logSection('STEP 5: Control → Asset Mapping');

      if (assets.length === 0) {
        warnings.push('No assets found. Create assets to test control-to-asset mapping.');
        console.log('⚠️  No assets found');
      } else {
        console.log(`\n   Assets: ${assets.length}`);
        
        const applicableControls = Array.from(controlsFromResponse);
        const controlsByType = {
          TRANSVERSAL: 0,
          SPECIFIC: 0,
        };

        applicableControls.forEach(controlId => {
          const control = controls.find(c => 
            String(c._id) === controlId || 
            c.controlId === controlId
          );
          if (control) {
            controlsByType[control.controlType] = (controlsByType[control.controlType] || 0) + 1;
          }
        });

        console.log(`   Transversal controls: ${controlsByType.TRANSVERSAL}`);
        console.log(`   Specific controls: ${controlsByType.SPECIFIC}`);

        // Test asset matching
        const assetsWithControls = [];
        for (const asset of assets) {
          const applicableToAsset = applicableControls.filter(controlId => {
            const control = controls.find(c => 
              String(c._id) === controlId || 
              c.controlId === controlId
            );
            if (!control) return false;

            // Transversal controls apply to all assets
            if (control.controlType === 'TRANSVERSAL') return true;

            // Specific controls check asset type and criticality
            if (control.controlType === 'SPECIFIC') {
              if (control.applicableAssetTypes && !control.applicableAssetTypes.includes(asset.type)) {
                return false;
              }
              if (control.minCriticalityLevel && asset.criticalityLevel < control.minCriticalityLevel) {
                return false;
              }
              return true;
            }

            return false;
          });

          if (applicableToAsset.length > 0) {
            assetsWithControls.push({
              asset: asset.name,
              controls: applicableToAsset.length,
            });
          }
        }

        console.log(`\n   Assets with applicable controls: ${assetsWithControls.length}/${assets.length}`);
        assetsWithControls.forEach(({ asset, controls }) => {
          console.log(`     ${asset}: ${controls} controls`);
        });
      }

      // ========================================================================
      // STEP 6: Pillar Analysis
      // ========================================================================
      logSection('STEP 6: Pillar Coverage Analysis');

      const pillarStats = {};
      CHILEAN_PRIVACY_PILLARS.forEach(pillar => {
        const pillarQuestions = questions.filter(q => q.pillar === pillar);
        const pillarRequirements = requirements.filter(r => r.pillar === pillar);
        const pillarControls = controls.filter(c => c.pillar === pillar);
        const pillarIsoControls = iso27701Controls.filter(c => c.pillar === pillar);
        
        const pillarNoAnswers = noAnswers.filter(a => {
          const q = questions.find(qq => qq.questionId === a.questionId);
          return q && q.pillar === pillar;
        });

        pillarStats[pillar] = {
          questions: pillarQuestions.length,
          requirements: pillarRequirements.length,
          controls: pillarControls.length,
          isoControls: pillarIsoControls.length,
          noAnswers: pillarNoAnswers.length,
        };
      });

      logSubsection('Pillar Statistics');
      CHILEAN_PRIVACY_PILLARS.forEach(pillar => {
        const stats = pillarStats[pillar];
        console.log(`\n   ${pillar}:`);
        console.log(`     Questions: ${stats.questions}`);
        console.log(`     Requirements: ${stats.requirements}`);
        console.log(`     Controls: ${stats.controls} (DB) + ${stats.isoControls} (ISO 27701)`);
        console.log(`     "No" answers: ${stats.noAnswers}`);
      });
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    logSection('SUMMARY');

    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n   🎉 All tests passed! Chilean Privacy matching engine flow is working correctly.');
    } else {
      if (errors.length > 0) {
        console.log(`\n   ❌ Errors (${errors.length}):`);
        errors.forEach((error, idx) => {
          console.log(`     ${idx + 1}. ${error}`);
        });
      }
      
      if (warnings.length > 0) {
        console.log(`\n   ⚠️  Warnings (${warnings.length}):`);
        warnings.forEach((warning, idx) => {
          console.log(`     ${idx + 1}. ${warning}`);
        });
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testChileanPrivacyEngineFlow().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
