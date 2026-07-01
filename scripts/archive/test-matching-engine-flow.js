/**
 * Comprehensive Matching Engine Flow Test
 * 
 * Tests the complete flow: Questionnaire → Requirements → Controls → Assets → Gap Analysis
 * 
 * Usage: node scripts/test-matching-engine-flow.js
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

function writeCollection(collectionName, data) {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

async function testMatchingEngineFlow() {
  console.log('\n🧪 Matching Engine Flow Test');
  console.log('Testing: Assets → Questionnaire → Requirements → Controls → Gap Analysis\n');

  const testUserId = 'test-matching-engine-user';
  let errors = [];
  let warnings = [];

  try {
    // ========================================================================
    // STEP 1: Load Test Data
    // ========================================================================
    logSection('STEP 1: Loading Test Data');

    const questions = readCollection('Question');
    const requirements = readCollection('DORARequirement');
    const controls = readCollection('Control');
    const assets = readCollection('Asset').filter(a => a.userId === testUserId);
    const questionnaireResponses = readCollection('QuestionnaireResponse').filter(r => r.userId === testUserId);

    console.log(`✅ Questions: ${questions.length}`);
    console.log(`✅ Requirements: ${requirements.length}`);
    console.log(`✅ Controls: ${controls.length}`);
    console.log(`✅ Assets: ${assets.length}`);
    console.log(`✅ Questionnaire Responses: ${questionnaireResponses.length}`);

    if (questions.length === 0) {
      throw new Error('No questions found! Run setup first.');
    }
    if (controls.length === 0) {
      throw new Error('No controls found! Run setup first.');
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

      // Analyze applicable controls
      if (response.applicableControls && response.applicableControls.length > 0) {
        logSubsection('Applicable Controls Analysis');

        // Check ID formats
        const controlIdFormats = {
          objectId: 0,
          string: 0,
          controlId: 0,
          mixed: 0,
        };

        const controlIdSamples = [];
        response.applicableControls.forEach((id, index) => {
          if (index < 5) controlIdSamples.push({ index, id, type: typeof id });
          
          if (typeof id === 'object' && id.toString) {
            controlIdFormats.objectId++;
          } else if (typeof id === 'string') {
            controlIdFormats.string++;
            // Check if it looks like a controlId (e.g., "ISO-5.1")
            if (id.includes('-') || id.match(/^[A-Z]+-\d+/)) {
              controlIdFormats.controlId++;
            }
          } else {
            controlIdFormats.mixed++;
          }
        });

        console.log(`   ID Format Analysis:`);
        console.log(`     ObjectId format: ${controlIdFormats.objectId}`);
        console.log(`     String format: ${controlIdFormats.string}`);
        console.log(`     ControlId format (e.g., ISO-5.1): ${controlIdFormats.controlId}`);
        console.log(`     Mixed/Other: ${controlIdFormats.mixed}`);

        if (controlIdFormats.mixed > 0 || (controlIdFormats.objectId > 0 && controlIdFormats.string > 0)) {
          errors.push('Inconsistent control ID formats in questionnaire response!');
          console.log(`   ❌ ERROR: Inconsistent ID formats detected!`);
        } else {
          console.log(`   ✅ ID formats are consistent`);
        }

        console.log(`\n   Sample Control IDs (first 5):`);
        controlIdSamples.forEach(sample => {
          console.log(`     [${sample.index}]: ${JSON.stringify(sample.id)} (${sample.type})`);
        });

        // Verify controls exist
        logSubsection('Control Existence Verification');

        let foundControls = 0;
        let missingControls = 0;
        const missingControlIds = [];

        response.applicableControls.forEach(controlId => {
          const idStr = String(controlId);
          const found = controls.some(c => {
            const cId1 = String(c._id || '');
            const cId2 = String(c.controlId || '');
            return cId1 === idStr || cId2 === idStr;
          });

          if (found) {
            foundControls++;
          } else {
            missingControls++;
            if (missingControlIds.length < 10) {
              missingControlIds.push(idStr);
            }
          }
        });

        console.log(`   Found Controls: ${foundControls}/${response.applicableControls.length}`);
        console.log(`   Missing Controls: ${missingControls}/${response.applicableControls.length}`);

        if (missingControls > 0) {
          errors.push(`${missingControls} controls from questionnaire not found in Control collection!`);
          console.log(`   ❌ ERROR: ${missingControls} controls not found!`);
          console.log(`   Sample missing IDs: ${missingControlIds.slice(0, 5).join(', ')}`);
        } else {
          console.log(`   ✅ All controls found in database`);
        }

        // Check control reasoning
        if (response.controlReasoning) {
          logSubsection('Control Reasoning Analysis');
          const reasoningCount = Object.keys(response.controlReasoning).length;
          console.log(`   Controls with reasoning: ${reasoningCount}`);
          if (reasoningCount > 0) {
            console.log(`   ✅ Reasoning is available for transparency`);
          }
        }
      } else {
        warnings.push('Questionnaire response has no applicable controls');
        console.log(`   ⚠️  WARNING: No applicable controls calculated`);
      }
    }

    // ========================================================================
    // STEP 3: Test Question-to-Requirement Mapping
    // ========================================================================
    logSection('STEP 3: Testing Question-to-Requirement Mapping');

    if (questionnaireResponses.length > 0) {
      const response = questionnaireResponses[0];
      const noAnswers = response.answers?.filter(a => a.value === 'no') || [];

      if (noAnswers.length > 0) {
        logSubsection('Analyzing "No" Answers');

        // Sample a few "no" answers to analyze
        const sampleNoAnswers = noAnswers.slice(0, 3);
        
        for (const answer of sampleNoAnswers) {
          const question = questions.find(q => String(q._id) === String(answer.questionId));
          if (!question) {
            warnings.push(`Question not found for answer: ${answer.questionId}`);
            continue;
          }

          console.log(`\n   Question: ${question.questionId}`);
          console.log(`   Text: ${question.text?.substring(0, 80)}...`);
          console.log(`   Pillar: ${question.pillar || 'N/A'}`);

          // Find requirements for this pillar
          const pillarRequirements = requirements.filter(r => r.pillar === question.pillar);
          console.log(`   Requirements in pillar: ${pillarRequirements.length}`);

          // Check if question has precomputed mappings
          const questionMappings = readCollection('QuestionMapping').filter(
            m => m.questionId === question.questionId
          );
          
          if (questionMappings.length > 0) {
            const mapping = questionMappings[0];
            console.log(`   Precomputed mappings: ✅`);
            console.log(`     Control-based requirements: ${mapping.controlBasedRequirements?.length || 0}`);
            console.log(`     Overall coherence: ${mapping.coherenceMetrics?.overallCoherence?.toFixed(2) || 0}%`);
          } else {
            warnings.push(`No precomputed mappings for question: ${question.questionId}`);
            console.log(`   Precomputed mappings: ❌ Not found`);
          }
        }
      } else {
        console.log('   No "no" answers to analyze');
      }
    }

    // ========================================================================
    // STEP 4: Test Requirement-to-Control Mapping
    // ========================================================================
    logSection('STEP 4: Testing Requirement-to-Control Mapping');

    // Sample a few requirements and verify they map to controls
    const sampleRequirements = requirements.slice(0, 5);
    
    logSubsection('Requirement-to-Control Mapping Sample');

    for (const req of sampleRequirements) {
      const reqId = String(req._id || req.requirementId);
      const reqIdAlt = req.requirementId || String(req._id);

      const mappedControls = controls.filter(c => {
        if (!c.requirementIds || c.requirementIds.length === 0) return false;
        return c.requirementIds.some(rid => {
          const ridStr = String(rid);
          return ridStr === reqId || ridStr === reqIdAlt;
        });
      });

      console.log(`\n   Requirement: ${req.requirementId || reqId}`);
      console.log(`   Title: ${req.title?.substring(0, 60)}...`);
      console.log(`   Mapped Controls: ${mappedControls.length}`);

      if (mappedControls.length === 0) {
        warnings.push(`Requirement ${req.requirementId || reqId} has no mapped controls`);
        console.log(`   ⚠️  WARNING: No controls mapped to this requirement`);
      } else {
        console.log(`   ✅ Has ${mappedControls.length} control(s)`);
        mappedControls.slice(0, 2).forEach(c => {
          console.log(`      - ${c.controlId || c._id}`);
        });
      }
    }

    // ========================================================================
    // STEP 5: Test Control-to-Asset Matching
    // ========================================================================
    logSection('STEP 5: Testing Control-to-Asset Matching');

    if (assets.length === 0) {
      warnings.push('No assets found for test user');
      console.log('⚠️  No assets found. Create assets to test matching.');
    } else {
      logSubsection('Asset Inventory');
      console.log(`   Total Assets: ${assets.length}`);
      
      const assetsByType = {};
      const assetsByCriticality = { 1: 0, 2: 0, 3: 0, 4: 0 };
      
      assets.forEach(asset => {
        assetsByType[asset.assetType] = (assetsByType[asset.assetType] || 0) + 1;
        assetsByCriticality[asset.criticalityLevel || 1]++;
      });

      console.log(`\n   By Type:`);
      Object.entries(assetsByType).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });

      console.log(`\n   By Criticality:`);
      Object.entries(assetsByCriticality).forEach(([level, count]) => {
        console.log(`     Level ${level}: ${count}`);
      });

      // Test matching logic
      logSubsection('Control-to-Asset Matching Test');

      // Sample a few controls
      const sampleControls = controls.slice(0, 5);
      
      for (const control of sampleControls) {
        console.log(`\n   Control: ${control.controlId || control._id}`);
        console.log(`   Type: ${control.controlType || 'N/A'}`);
        console.log(`   Applicable Asset Types: ${control.applicableAssetTypes?.join(', ') || 'N/A'}`);
        console.log(`   Min Criticality: ${control.minCriticalityLevel || 'N/A'}`);

        // Apply matching logic
        const applicableAssets = assets.filter(asset => {
          if (control.controlType === 'TRANSVERSAL') {
            if (control.minCriticalityLevel) {
              return asset.criticalityLevel >= control.minCriticalityLevel;
            }
            return true;
          } else if (control.controlType === 'SPECIFIC') {
            const matchesType = control.applicableAssetTypes?.includes(asset.assetType) || false;
            if (matchesType && control.minCriticalityLevel) {
              return asset.criticalityLevel >= control.minCriticalityLevel;
            }
            return matchesType;
          }
          return false;
        });

        console.log(`   Applicable Assets: ${applicableAssets.length}`);
        if (applicableAssets.length > 0) {
          applicableAssets.slice(0, 3).forEach(a => {
            console.log(`      - ${a.name} (${a.assetType}, Criticality: ${a.criticalityLevel})`);
          });
        } else {
          console.log(`   ⚠️  No assets match this control`);
        }
      }
    }

    // ========================================================================
    // STEP 6: Test Gap Analysis Consistency
    // ========================================================================
    logSection('STEP 6: Testing Gap Analysis Consistency');

    if (questionnaireResponses.length > 0) {
      const response = questionnaireResponses[0];
      
      if (response.applicableControls && response.applicableControls.length > 0) {
        logSubsection('ID Matching Test');

        // Get controls by pillar
        const pillars = [...new Set(controls.map(c => c.pillar).filter(Boolean))];
        
        for (const pillar of pillars.slice(0, 2)) {
          console.log(`\n   Testing Pillar: ${pillar}`);
          
          const pillarControls = controls.filter(c => c.pillar === pillar);
          const questionnaireControlIds = new Set(
            response.applicableControls.map(id => String(id))
          );

          // Test matching logic (same as gap-analysis/route.ts)
          const matchedControls = pillarControls.filter(control => {
            const controlId1 = String(control._id || '');
            const controlId2 = String(control.controlId || '');
            return questionnaireControlIds.has(controlId1) || 
                   questionnaireControlIds.has(controlId2);
          });

          console.log(`     Total controls in pillar: ${pillarControls.length}`);
          console.log(`     Controls in questionnaire: ${Array.from(questionnaireControlIds).filter(id => {
            return pillarControls.some(c => {
              const cId1 = String(c._id || '');
              const cId2 = String(c.controlId || '');
              return cId1 === id || cId2 === id;
            });
          }).length}`);
          console.log(`     Matched controls: ${matchedControls.length}`);

          if (matchedControls.length === 0 && questionnaireControlIds.size > 0) {
            errors.push(`No controls matched for pillar ${pillar}! ID format mismatch likely.`);
            console.log(`     ❌ ERROR: No controls matched!`);
            
            // Show sample IDs for debugging
            console.log(`     Sample questionnaire IDs:`, Array.from(questionnaireControlIds).slice(0, 3));
            console.log(`     Sample pillar control IDs:`, pillarControls.slice(0, 3).map(c => ({
              _id: String(c._id),
              controlId: String(c.controlId || '')
            })));
          } else {
            console.log(`     ✅ Matching works correctly`);
          }
        }
      }
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    logSection('TEST SUMMARY');

    console.log(`\n✅ Tests Completed`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log(`\n❌ ERRORS FOUND:`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS:`);
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log(`\n🎉 All tests passed! Matching engine appears to be working correctly.`);
    } else if (errors.length === 0) {
      console.log(`\n✅ No critical errors found. Review warnings above.`);
    } else {
      console.log(`\n❌ Critical errors found. Please fix before proceeding.`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testMatchingEngineFlow()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
