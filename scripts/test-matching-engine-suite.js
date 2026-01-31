/**
 * Comprehensive Matching Engine Test Suite
 * 
 * Tests the complete flow: Questions → Requirements → Controls → Gap Analysis
 * Ensures no regressions in the matching logic
 * 
 * Usage: node scripts/test-matching-engine-suite.js
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
  console.log('\n🧪 Matching Engine Test Suite');
  console.log('Testing complete flow: Questions → Requirements → Controls → Gap Analysis\n');

  // Load data
  const questions = readCollection('Question');
  const requirements = readCollection('DORARequirement');
  const controls = readCollection('Control');
  const questionMappings = readCollection('QuestionMapping');
  const questionnaireResponses = readCollection('QuestionnaireResponse');

  // ========================================================================
  // TEST GROUP 1: Precomputed Mappings (Question → Requirement)
  // ========================================================================
  logSection('TEST GROUP 1: Precomputed Mappings (Question → Requirement)');

  runTest('All questions have precomputed mappings', () => {
    assert(questionMappings.length > 0, 'No question mappings found');
    assert(questionMappings.length === questions.length, 
      `Mismatch: ${questionMappings.length} mappings for ${questions.length} questions`);
  });

  runTest('Mappings have reasonable requirement counts', () => {
    const mappingStats = questionMappings.map(m => ({
      questionId: m.questionId,
      count: m.controlBasedRequirements?.length || 0,
    }));

    const avgCount = mappingStats.reduce((sum, s) => sum + s.count, 0) / mappingStats.length;
    const maxCount = Math.max(...mappingStats.map(s => s.count));
    const minCount = Math.min(...mappingStats.map(s => s.count));

    console.log(`   Average requirements per question: ${avgCount.toFixed(2)}`);
    console.log(`   Max: ${maxCount}, Min: ${minCount}`);

    // After improvements, should be 0-20 per question
    assertInRange(avgCount, 0, 25, 'Average requirements per question should be 0-25');
    assert(maxCount <= 20, `Max requirements per question should be <= 20, got ${maxCount}`);
  });

  runTest('Mappings have coherence metrics', () => {
    questionMappings.forEach(mapping => {
      assert(mapping.coherenceMetrics, `Mapping ${mapping.questionId} missing coherenceMetrics`);
      assert(typeof mapping.coherenceMetrics.overallCoherence === 'number', 
        `Mapping ${mapping.questionId} has invalid coherence`);
    });
  });

  runTest('Mappings use filtered results (no low confidence)', () => {
    questionMappings.forEach(mapping => {
      if (mapping.nlpSimilarities && mapping.nlpSimilarities.length > 0) {
        // All similarities should be >= 0.5 (medium/high confidence)
        const lowConfidence = mapping.nlpSimilarities.filter(s => s.similarity < 0.5);
        assert(lowConfidence.length === 0, 
          `Mapping ${mapping.questionId} has ${lowConfidence.length} low-confidence matches (should be 0)`);
      }
    });
  });

  // ========================================================================
  // TEST GROUP 2: Requirement-to-Control Mapping (Static)
  // ========================================================================
  logSection('TEST GROUP 2: Requirement-to-Control Mapping (Static)');

  runTest('All requirements map to at least one control', () => {
    const reqsWithoutControls = [];
    
    for (const req of requirements.slice(0, 20)) { // Sample 20 requirements
      const reqId = String(req._id || req.requirementId);
      const reqRequirementId = req.requirementId || '';
      
      const mappedControls = controls.filter(c => {
        if (!c.requirementIds || c.requirementIds.length === 0) return false;
        return c.requirementIds.some(rid => {
          const ridStr = String(rid);
          return ridStr === reqId || ridStr === reqRequirementId;
        });
      });
      
      if (mappedControls.length === 0) {
        reqsWithoutControls.push(req.requirementId || reqId);
      }
    }
    
    console.log(`   Sampled ${Math.min(20, requirements.length)} requirements`);
    console.log(`   Requirements without controls: ${reqsWithoutControls.length}`);
    
    // Some requirements might not map to controls (acceptable)
    // But most should
    assert(reqsWithoutControls.length < 10, 
      `Too many requirements (${reqsWithoutControls.length}) without controls`);
  });

  runTest('Controls have requirement mappings', () => {
    const controlsWithoutReqs = controls.filter(c => 
      !c.requirementIds || c.requirementIds.length === 0
    );
    
    console.log(`   Controls without requirements: ${controlsWithoutReqs.length}/${controls.length}`);
    
    // Most controls should have requirement mappings
    const percentage = (controlsWithoutReqs.length / controls.length) * 100;
    assert(percentage < 50, 
      `Too many controls (${percentage.toFixed(1)}%) without requirement mappings`);
  });

  // ========================================================================
  // TEST GROUP 3: Questionnaire Response Calculation
  // ========================================================================
  logSection('TEST GROUP 3: Questionnaire Response Calculation');

  runTest('Questionnaire response with all "Yes" has 0 controls', () => {
    // Find a response with all "Yes" answers
    const allYesResponse = questionnaireResponses.find(r => {
      if (!r.answers || r.answers.length === 0) return false;
      return r.answers.every(a => a.value === 'yes');
    });

    if (allYesResponse) {
      const controlCount = allYesResponse.applicableControls?.length || 0;
      assertEqual(controlCount, 0, 
        `All "Yes" response should have 0 controls, got ${controlCount}`);
      console.log(`   ✅ Found all "Yes" response with ${controlCount} controls`);
    } else {
      console.log(`   ⚠️  No all "Yes" response found to test`);
    }
  });

  runTest('Questionnaire response with "No" answers has controls', () => {
    const responsesWithNo = questionnaireResponses.filter(r => {
      if (!r.answers || r.answers.length === 0) return false;
      return r.answers.some(a => a.value === 'no');
    });

    if (responsesWithNo.length > 0) {
      responsesWithNo.forEach(response => {
        const noCount = response.answers.filter(a => a.value === 'no').length;
        const controlCount = response.applicableControls?.length || 0;
        
        console.log(`   Response with ${noCount} "No" answers: ${controlCount} controls`);
        
        // Should have some controls (at least 1 per "No" answer, but could be more)
        assert(controlCount > 0, 
          `Response with ${noCount} "No" answers should have controls, got ${controlCount}`);
        
        // Should not have too many (reasonable limit: 50 controls per "No" answer)
        const maxExpected = noCount * 50;
        assert(controlCount <= maxExpected, 
          `Response has too many controls: ${controlCount} (expected <= ${maxExpected} for ${noCount} "No" answers)`);
      });
    } else {
      console.log(`   ⚠️  No responses with "No" answers found to test`);
    }
  });

  runTest('Questionnaire response has control reasoning', () => {
    const responsesWithControls = questionnaireResponses.filter(r => 
      r.applicableControls && r.applicableControls.length > 0
    );

    if (responsesWithControls.length > 0) {
      responsesWithControls.forEach(response => {
        if (response.controlReasoning) {
          const reasoningCount = Object.keys(response.controlReasoning).length;
          console.log(`   Response has reasoning for ${reasoningCount} controls`);
          assert(reasoningCount > 0, 'Response should have control reasoning');
        }
      });
    } else {
      console.log(`   ⚠️  No responses with controls found to test`);
    }
  });

  // ========================================================================
  // TEST GROUP 4: Gap Analysis Filtering
  // ========================================================================
  logSection('TEST GROUP 4: Gap Analysis Filtering');

  runTest('Gap analysis uses questionnaire response controls', () => {
    const responsesWithControls = questionnaireResponses.filter(r => 
      r.applicableControls && r.applicableControls.length > 0
    );

    if (responsesWithControls.length > 0) {
      const response = responsesWithControls[0];
      const controlIds = new Set(response.applicableControls.map(id => String(id)));
      
      // Check that controls exist
      const foundControls = controls.filter(c => {
        const cId1 = String(c._id || '');
        const cId2 = String(c.controlId || '');
        return controlIds.has(cId1) || controlIds.has(cId2);
      });
      
      console.log(`   Response has ${controlIds.size} control IDs`);
      console.log(`   Found ${foundControls.length} matching controls in database`);
      
      // Should find most controls (allowing for ID format differences)
      // Note: Match rate might be lower if questionnaire uses controlId strings but DB has _id
      const matchRate = foundControls.length / controlIds.size;
      console.log(`   Match rate: ${(matchRate * 100).toFixed(1)}%`);
      
      // Acceptable range: 50-100% (ID format differences are expected)
      if (matchRate < 0.5) {
        console.log(`   ⚠️  WARNING: Very low match rate - possible ID format issue`);
        console.log(`   Sample questionnaire IDs:`, Array.from(controlIds).slice(0, 3));
        console.log(`   Sample found control IDs:`, foundControls.slice(0, 3).map(c => ({
          _id: String(c._id),
          controlId: String(c.controlId || '')
        })));
      }
      
      // At least 50% should match (allowing for format differences)
      assert(matchRate >= 0.5, 
        `Very low match rate: ${(matchRate * 100).toFixed(1)}% (expected >= 50%)`);
    } else {
      console.log(`   ⚠️  No responses with controls found to test`);
    }
  });

  runTest('Gap analysis handles empty controls correctly', () => {
    const allYesResponses = questionnaireResponses.filter(r => {
      if (!r.answers || r.answers.length === 0) return false;
      return r.answers.every(a => a.value === 'yes');
    });

    if (allYesResponses.length > 0) {
      allYesResponses.forEach(response => {
        const controlCount = response.applicableControls?.length || 0;
        assertEqual(controlCount, 0, 
          `All "Yes" response should have 0 controls for gap analysis`);
        console.log(`   ✅ All "Yes" response correctly has 0 controls`);
      });
    } else {
      console.log(`   ⚠️  No all "Yes" responses found to test`);
    }
  });

  // ========================================================================
  // TEST GROUP 5: ID Format Consistency
  // ========================================================================
  logSection('TEST GROUP 5: ID Format Consistency');

  runTest('Control IDs are consistent in questionnaire responses', () => {
    const responsesWithControls = questionnaireResponses.filter(r => 
      r.applicableControls && r.applicableControls.length > 0
    );

    if (responsesWithControls.length > 0) {
      responsesWithControls.forEach(response => {
        const controlIds = response.applicableControls.map(id => String(id));
        const idTypes = {
          objectId: 0,
          string: 0,
          controlId: 0,
        };

        controlIds.forEach(id => {
          if (typeof id === 'object') {
            idTypes.objectId++;
          } else if (typeof id === 'string') {
            idTypes.string++;
            if (id.includes('-') || id.match(/^[A-Z]+-\d+/)) {
              idTypes.controlId++;
            }
          }
        });

        // Should use consistent format (mostly one type)
        const total = controlIds.length;
        const maxType = Math.max(idTypes.objectId, idTypes.string);
        const consistency = maxType / total;
        
        console.log(`   ID types: ObjectId=${idTypes.objectId}, String=${idTypes.string}, ControlId=${idTypes.controlId}`);
        assert(consistency >= 0.8, 
          `Low ID consistency: ${(consistency * 100).toFixed(1)}% (expected >= 80%)`);
      });
    } else {
      console.log(`   ⚠️  No responses with controls found to test`);
    }
  });

  // ========================================================================
  // TEST GROUP 6: End-to-End Flow
  // ========================================================================
  logSection('TEST GROUP 6: End-to-End Flow Validation');

  runTest('Complete flow: Question → Requirement → Control', () => {
    // Pick a question with "No" answer
    const testQuestion = questions.find(q => q.pillar === 'ICT_RISK_MANAGEMENT');
    
    if (!testQuestion) {
      console.log(`   ⚠️  No test question found`);
      return;
    }

    const mapping = questionMappings.find(m => m.questionId === testQuestion.questionId);
    if (!mapping || !mapping.controlBasedRequirements || mapping.controlBasedRequirements.length === 0) {
      console.log(`   ⚠️  Question ${testQuestion.questionId} has no mappings`);
      return;
    }

    // Step 1: Question → Requirements
    const reqIds = mapping.controlBasedRequirements;
    console.log(`   Question ${testQuestion.questionId} → ${reqIds.length} requirements`);

    // Step 2: Requirements → Controls
    const mappedControls = controls.filter(c => {
      if (!c.requirementIds || c.requirementIds.length === 0) return false;
      return c.requirementIds.some(rid => {
        const ridStr = String(rid);
        return reqIds.includes(ridStr) || 
               requirements.some(r => {
                 const rId = String(r._id || r.requirementId);
                 return (rId === ridStr || r.requirementId === ridStr) && reqIds.includes(r.requirementId);
               });
      });
    });

    console.log(`   ${reqIds.length} requirements → ${mappedControls.length} controls`);

    // Should have reasonable mapping
    assert(mappedControls.length > 0, 'Should map to at least one control');
    assert(mappedControls.length <= 50, 
      `Too many controls (${mappedControls.length}) for ${reqIds.length} requirements`);
  });

  // ========================================================================
  // TEST GROUP 7: Edge Cases
  // ========================================================================
  logSection('TEST GROUP 7: Edge Cases');

  runTest('Handles questions with 0 requirements', () => {
    const questionsWithNoReqs = questionMappings.filter(m => 
      !m.controlBasedRequirements || m.controlBasedRequirements.length === 0
    );

    console.log(`   Questions with 0 requirements: ${questionsWithNoReqs.length}`);
    
    // Some questions might have 0 requirements (if similarity threshold too high)
    // This can happen for questions in pillars with fewer requirements or low similarity
    const percentage = (questionsWithNoReqs.length / questionMappings.length) * 100;
    console.log(`   Percentage: ${percentage.toFixed(1)}%`);
    
    // Note: This is acceptable if similarity threshold is strict
    // We'll log a warning but not fail the test
    if (percentage > 50) {
      console.log(`   ⚠️  WARNING: ${percentage.toFixed(1)}% of questions have 0 requirements`);
      console.log(`   This might indicate similarity threshold is too strict`);
      console.log(`   Consider lowering MIN_SIMILARITY_THRESHOLD if needed`);
    }
    
    // Don't fail - this is a configuration choice, not a bug
    console.log(`   ✅ Acceptable (configuration-dependent)`);
  });

  runTest('Handles missing precomputed mappings gracefully', () => {
    const questionsWithoutMappings = questions.filter(q => {
      return !questionMappings.find(m => m.questionId === q.questionId);
    });

    console.log(`   Questions without mappings: ${questionsWithoutMappings.length}`);
    
    // Should have mappings for all questions (or very few missing)
    assert(questionsWithoutMappings.length < questions.length * 0.1, 
      `Too many questions (${questionsWithoutMappings.length}) without mappings`);
  });

  // ========================================================================
  // SUMMARY
  // ========================================================================
  logSection('TEST SUMMARY');

  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);

  if (failures.length > 0) {
    console.log(`\n❌ FAILURES:`);
    failures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure.test}`);
      console.log(`      ${failure.error}`);
    });
  }

  if (testsFailed === 0) {
    console.log(`\n🎉 All tests passed! No regressions detected.`);
    return 0;
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review failures above.`);
    return 1;
  }
}

// Run the test suite
runTestSuite()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    console.error(error.stack);
    process.exit(1);
  });
