/**
 * Chilean Privacy Matching Engine Test Suite
 * 
 * Comprehensive test suite for Chilean Privacy Law matching engine
 * Tests: Questions → Requirements → Controls → Gap Analysis
 * 
 * Usage: node scripts/test-chilean-privacy-suite.js
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
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));
}

function logTest(testName) {
  console.log(`\n🧪 ${testName}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`❌ ASSERTION FAILED: ${message}\n   Expected: ${expected}\n   Actual: ${actual}`);
  }
}

function assertInRange(value, min, max, message) {
  if (value < min || value > max) {
    throw new Error(`❌ ASSERTION FAILED: ${message}\n   Value: ${value}\n   Expected range: ${min}-${max}`);
  }
}

let testsPassed = 0;
let testsFailed = 0;
const failures = [];

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`   ✅ PASSED`);
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    testsFailed++;
    failures.push({ test: testName, error: error.message });
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTestSuite() {
  console.log('\n🧪 Chilean Privacy Matching Engine Test Suite');
  console.log('Testing complete flow: Questions → Requirements → Controls → Gap Analysis\n');

  // Load data
  logSection('Loading Data');

  const allQuestions = readCollection('Question');
  const allRequirements = readCollection('Requirement');
  const allControls = readCollection('Control');
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

  console.log(`✅ Questions: ${questions.length}`);
  console.log(`✅ Requirements: ${requirements.length}`);
  console.log(`✅ Controls: ${controls.length}`);
  console.log(`✅ ISO 27701 Controls: ${iso27701Controls.length}`);
  console.log(`✅ Question Mappings: ${questionMappings.length}`);

  // ========================================================================
  // TEST 1: Data Availability
  // ========================================================================
  logSection('TEST 1: Data Availability');

  runTest('Questions exist', () => {
    assert(questions.length > 0, 'No Chilean Privacy questions found');
  });

  runTest('Requirements exist', () => {
    assert(requirements.length > 0, 'No Chilean Privacy requirements found');
  });

  runTest('Controls or ISO 27701 controls exist', () => {
    assert(
      controls.length > 0 || iso27701Controls.length > 0,
      'No controls found for Chilean Privacy'
    );
  });

  // ========================================================================
  // TEST 2: Question Structure
  // ========================================================================
  logSection('TEST 2: Question Structure');

  runTest('All questions have questionId', () => {
    const questionsWithoutId = questions.filter(q => !q.questionId);
    assert(questionsWithoutId.length === 0, `${questionsWithoutId.length} questions missing questionId`);
  });

  runTest('All questions have pillar', () => {
    const questionsWithoutPillar = questions.filter(q => !q.pillar || !CHILEAN_PRIVACY_PILLARS.includes(q.pillar));
    assert(questionsWithoutPillar.length === 0, `${questionsWithoutPillar.length} questions have invalid pillar`);
  });

  runTest('All questions have text', () => {
    const questionsWithoutText = questions.filter(q => !q.text || q.text.trim().length === 0);
    assert(questionsWithoutText.length === 0, `${questionsWithoutText.length} questions missing text`);
  });

  // ========================================================================
  // TEST 3: Requirement Structure
  // ========================================================================
  logSection('TEST 3: Requirement Structure');

  runTest('All requirements have requirementId', () => {
    const reqsWithoutId = requirements.filter(r => !r.requirementId);
    assert(reqsWithoutId.length === 0, `${reqsWithoutId.length} requirements missing requirementId`);
  });

  runTest('All requirements have pillar', () => {
    const reqsWithoutPillar = requirements.filter(r => !r.pillar || !CHILEAN_PRIVACY_PILLARS.includes(r.pillar));
    assert(reqsWithoutPillar.length === 0, `${reqsWithoutPillar.length} requirements have invalid pillar`);
  });

  runTest('All requirements have title', () => {
    const reqsWithoutTitle = requirements.filter(r => !r.title || r.title.trim().length === 0);
    assert(reqsWithoutTitle.length === 0, `${reqsWithoutTitle.length} requirements missing title`);
  });

  // ========================================================================
  // TEST 4: Question Mapping Coverage
  // ========================================================================
  logSection('TEST 4: Question Mapping Coverage');

  const questionsWithMappings = questions.filter(q => {
    const mapping = questionMappings.find(m => m.questionId === q.questionId);
    return mapping && mapping.controlBasedRequirements && mapping.controlBasedRequirements.length > 0;
  });

  const mappingCoverage = (questionsWithMappings.length / questions.length) * 100;

  runTest('At least 50% of questions have mappings', () => {
    assertInRange(mappingCoverage, 50, 100, `Only ${mappingCoverage.toFixed(1)}% of questions have mappings`);
  });

  runTest('Mappings contain valid requirement IDs', () => {
    let invalidMappings = 0;
    questionMappings.forEach(mapping => {
      if (mapping.controlBasedRequirements) {
        mapping.controlBasedRequirements.forEach(reqId => {
          const req = requirements.find(r => r.requirementId === reqId);
          if (!req) {
            invalidMappings++;
          }
        });
      }
    });
    assert(invalidMappings === 0, `${invalidMappings} invalid requirement IDs in mappings`);
  });

  // ========================================================================
  // TEST 5: Requirement to Control Mapping
  // ========================================================================
  logSection('TEST 5: Requirement to Control Mapping');

  const requirementsWithControls = requirements.filter(req => {
    const reqId = req.requirementId;
    
    // Check database controls
    const dbControls = controls.filter(c => {
      if (!c.requirementIds || !Array.isArray(c.requirementIds)) return false;
      return c.requirementIds.some(rId => 
        String(rId) === String(req._id) || 
        String(rId) === reqId
      );
    });

    // Check ISO 27701 controls
    const isoControls = iso27701Controls.filter(c => {
      if (c.chileRequirements && Array.isArray(c.chileRequirements)) {
        return c.chileRequirements.includes(reqId);
      }
      return false;
    });

    return dbControls.length > 0 || isoControls.length > 0;
  });

  const requirementMappingCoverage = (requirementsWithControls.length / requirements.length) * 100;

  runTest('At least 30% of requirements map to controls', () => {
    assertInRange(requirementMappingCoverage, 30, 100, `Only ${requirementMappingCoverage.toFixed(1)}% of requirements map to controls`);
  });

  // ========================================================================
  // TEST 6: Pillar Coverage
  // ========================================================================
  logSection('TEST 6: Pillar Coverage');

  CHILEAN_PRIVACY_PILLARS.forEach(pillar => {
    runTest(`Pillar ${pillar} has questions`, () => {
      const pillarQuestions = questions.filter(q => q.pillar === pillar);
      assert(pillarQuestions.length > 0, `Pillar ${pillar} has no questions`);
    });

    runTest(`Pillar ${pillar} has requirements`, () => {
      const pillarRequirements = requirements.filter(r => r.pillar === pillar);
      assert(pillarRequirements.length > 0, `Pillar ${pillar} has no requirements`);
    });
  });

  // ========================================================================
  // TEST 7: ISO 27701 Controls Structure
  // ========================================================================
  logSection('TEST 7: ISO 27701 Controls Structure');

  if (iso27701Controls.length > 0) {
    runTest('ISO 27701 controls have controlId', () => {
      const controlsWithoutId = iso27701Controls.filter(c => !c.controlId);
      assert(controlsWithoutId.length === 0, `${controlsWithoutId.length} ISO 27701 controls missing controlId`);
    });

    runTest('ISO 27701 controls have pillar', () => {
      const controlsWithoutPillar = iso27701Controls.filter(c => !c.pillar || !CHILEAN_PRIVACY_PILLARS.includes(c.pillar));
      assert(controlsWithoutPillar.length === 0, `${controlsWithoutPillar.length} ISO 27701 controls have invalid pillar`);
    });
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  logSection('TEST SUMMARY');

  console.log(`\n   Tests Passed: ${testsPassed}`);
  console.log(`   Tests Failed: ${testsFailed}`);
  console.log(`   Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  if (testsFailed > 0) {
    console.log(`\n   Failed Tests:`);
    failures.forEach((failure, idx) => {
      console.log(`     ${idx + 1}. ${failure.test}: ${failure.error}`);
    });
  }

  if (testsFailed === 0) {
    console.log(`\n   🎉 All tests passed! Chilean Privacy matching engine is working correctly.`);
  } else {
    console.log(`\n   ⚠️  Some tests failed. Review the errors above.`);
  }

  console.log('\n');
}

// Run the test suite
runTestSuite().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
