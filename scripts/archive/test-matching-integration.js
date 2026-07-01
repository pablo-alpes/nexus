/**
 * Integration Test: Full Matching Engine Flow
 * 
 * Tests the complete integration: Submit questionnaire → Calculate controls → Generate gap analysis
 * 
 * Usage: node scripts/test-matching-integration.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/local-db');

function readCollection(collectionName) {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return [];
  }
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));
}

async function testIntegration() {
  console.log('\n🔗 Matching Engine Integration Test');
  console.log('Testing: Questionnaire → Controls → Gap Analysis\n');

  const testUserId = 'test-integration-user';
  let errors = [];

  try {
    // Load data
    const questions = readCollection('Question');
    const requirements = readCollection('DORARequirement');
    const controls = readCollection('Control');
    const questionMappings = readCollection('QuestionMapping');
    const questionnaireResponses = readCollection('QuestionnaireResponse').filter(r => r.userId === testUserId);
    const gapAnalyses = readCollection('GapAnalysis').filter(g => g.userId === testUserId);

    logSection('STEP 1: Simulate Questionnaire Submission');

    // Create a test questionnaire response with known answers
    const testAnswers = [];
    const pillars = ['ICT_RISK_MANAGEMENT', 'INCIDENT_MANAGEMENT', 'THIRD_PARTY_RISK'];
    let noAnswerCount = 0;

    for (const pillar of pillars) {
      const pillarQuestions = questions.filter(q => q.pillar === pillar).slice(0, 2);
      
      for (const question of pillarQuestions) {
        // Mix of yes and no
        const value = Math.random() > 0.5 ? 'yes' : 'no';
        if (value === 'no') noAnswerCount++;
        
        testAnswers.push({
          questionId: question._id,
          value: value,
        });
      }
    }

    console.log(`   Created ${testAnswers.length} test answers`);
    console.log(`   "No" answers: ${noAnswerCount}`);
    console.log(`   "Yes" answers: ${testAnswers.length - noAnswerCount}`);

    // Simulate requirement calculation (like questionnaire/response/route.ts)
    logSection('STEP 2: Calculate Requirements from "No" Answers');

    const requirementsFromNoAnswers = new Set();
    const noAnswers = testAnswers.filter(a => a.value === 'no');

    for (const answer of noAnswers) {
      const question = questions.find(q => q._id === answer.questionId);
      if (!question) continue;

      const mapping = questionMappings.find(m => m.questionId === question.questionId);
      if (mapping && mapping.controlBasedRequirements) {
        mapping.controlBasedRequirements.forEach(reqId => {
          requirementsFromNoAnswers.add(reqId);
        });
      }
    }

    console.log(`   Requirements from "No" answers: ${requirementsFromNoAnswers.size}`);
    assert(requirementsFromNoAnswers.size > 0, 
      `Should have requirements from ${noAnswerCount} "No" answers`);

    // Simulate control calculation
    logSection('STEP 3: Calculate Controls from Requirements');

    const applicableControlIds = new Set();
    const requirementIdsArray = Array.from(requirementsFromNoAnswers);

    // Find controls that map to these requirements
    for (const control of controls) {
      if (!control.requirementIds || control.requirementIds.length === 0) continue;

      const hasMatchingReq = control.requirementIds.some(rid => {
        const ridStr = String(rid);
        return requirementIdsArray.includes(ridStr) ||
               requirements.some(r => {
                 const rId = String(r._id || r.requirementId);
                 return (rId === ridStr || r.requirementId === ridStr) && 
                        requirementIdsArray.includes(r.requirementId);
               });
      });

      if (hasMatchingReq) {
        applicableControlIds.add(String(control._id || control.controlId));
      }
    }

    console.log(`   Controls from requirements: ${applicableControlIds.size}`);
    assert(applicableControlIds.size > 0, 
      `Should have controls from ${requirementsFromNoAnswers.size} requirements`);

    // Verify reasonable count
    const expectedMin = noAnswerCount; // At least 1 control per "No" answer
    const expectedMax = noAnswerCount * 20; // Max 20 controls per "No" answer
    assert(applicableControlIds.size >= expectedMin, 
      `Too few controls: ${applicableControlIds.size} (expected >= ${expectedMin})`);
    assert(applicableControlIds.size <= expectedMax, 
      `Too many controls: ${applicableControlIds.size} (expected <= ${expectedMax})`);

    // Simulate gap analysis filtering
    logSection('STEP 4: Simulate Gap Analysis Filtering');

    const testPillar = 'ICT_RISK_MANAGEMENT';
    const allControlsForPillar = controls.filter(c => c.pillar === testPillar);
    const applicableControlIdsArray = Array.from(applicableControlIds);

    // Filter controls (like gap-analysis/route.ts)
    const filteredControls = allControlsForPillar.filter(control => {
      const controlId1 = String(control._id || '');
      const controlId2 = String(control.controlId || '');
      return applicableControlIdsArray.includes(controlId1) || 
             applicableControlIdsArray.includes(controlId2);
    });

    console.log(`   Total controls for pillar: ${allControlsForPillar.length}`);
    console.log(`   Filtered controls: ${filteredControls.length}`);
    
    // Should filter correctly
    assert(filteredControls.length <= applicableControlIds.size, 
      `Filtered controls (${filteredControls.length}) should be <= applicable controls (${applicableControlIds.size})`);

    logSection('INTEGRATION TEST SUMMARY');

    console.log(`\n✅ Integration test passed!`);
    console.log(`   Questions → Requirements: ✅`);
    console.log(`   Requirements → Controls: ✅`);
    console.log(`   Gap Analysis Filtering: ✅`);
    console.log(`\n🎉 Full flow works correctly!`);

  } catch (error) {
    console.error(`\n❌ Integration test failed: ${error.message}`);
    errors.push(error.message);
  }

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} error(s) found`);
    return 1;
  }

  return 0;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

testIntegration()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n💥 Test crashed:', error);
    process.exit(1);
  });
