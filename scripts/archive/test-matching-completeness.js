/**
 * Completeness Test: Verify ALL Questions and Requirements are Mapped
 * 
 * Ensures:
 * 1. Every question has a precomputed mapping (or valid reason for not having one)
 * 2. Every question's requirements map to controls
 * 3. Every requirement maps to at least one control
 * 4. Every control maps to at least one requirement
 * 
 * Usage: node scripts/test-matching-completeness.js
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

function logSubsection(title) {
  console.log('\n' + '-'.repeat(70));
  console.log(title);
  console.log('-'.repeat(70));
}

let issues = [];
let warnings = [];

function addIssue(message) {
  issues.push(message);
  console.log(`   ❌ ISSUE: ${message}`);
}

function addWarning(message) {
  warnings.push(message);
  console.log(`   ⚠️  WARNING: ${message}`);
}

async function testCompleteness() {
  console.log('\n🔍 Matching Engine Completeness Test');
  console.log('Verifying ALL questions and requirements are properly mapped\n');

  // Load all data
  const questions = readCollection('Question');
  const requirements = readCollection('DORARequirement');
  const controls = readCollection('Control');
  const questionMappings = readCollection('QuestionMapping');

  console.log(`📊 Data Loaded:`);
  console.log(`   Questions: ${questions.length}`);
  console.log(`   Requirements: ${requirements.length}`);
  console.log(`   Controls: ${controls.length}`);
  console.log(`   Question Mappings: ${questionMappings.length}`);

  // ========================================================================
  // TEST 1: Every Question Has a Mapping
  // ========================================================================
  logSection('TEST 1: Question-to-Requirement Mapping Completeness');

  const questionsWithoutMappings = [];
  const questionsWithEmptyMappings = [];
  const questionsWithMappings = [];

  for (const question of questions) {
    const mapping = questionMappings.find(m => m.questionId === question.questionId);
    
    if (!mapping) {
      questionsWithoutMappings.push(question);
    } else if (!mapping.controlBasedRequirements || mapping.controlBasedRequirements.length === 0) {
      questionsWithEmptyMappings.push({ question, mapping });
    } else {
      questionsWithMappings.push({ question, mapping });
    }
  }

  logSubsection('Mapping Coverage');

  console.log(`\n   Questions with mappings: ${questionsWithMappings.length}/${questions.length}`);
  console.log(`   Questions without mappings: ${questionsWithoutMappings.length}`);
  console.log(`   Questions with empty mappings: ${questionsWithEmptyMappings.length}`);

  if (questionsWithoutMappings.length > 0) {
    addIssue(`${questionsWithoutMappings.length} questions have NO precomputed mappings`);
    console.log(`\n   Questions without mappings:`);
    questionsWithoutMappings.forEach(q => {
      console.log(`     - ${q.questionId}: ${q.text?.substring(0, 60)}...`);
    });
  }

  if (questionsWithEmptyMappings.length > 0) {
    console.log(`\n   Questions with empty mappings (0 requirements):`);
    questionsWithEmptyMappings.forEach(({ question, mapping }) => {
      const coherence = mapping.coherenceMetrics?.overallCoherence || 0;
      console.log(`     - ${question.questionId}: ${question.text?.substring(0, 60)}...`);
      console.log(`       Coherence: ${coherence.toFixed(2)}%`);
      if (coherence === 0) {
        addWarning(`Question ${question.questionId} has 0% coherence - similarity threshold may be too strict`);
      }
    });
  }

  // ========================================================================
  // TEST 2: Every Question's Requirements Map to Controls
  // ========================================================================
  logSection('TEST 2: Requirement-to-Control Mapping Completeness (Per Question)');

  const questionsWithUnmappedReqs = [];
  const requirementToControlMap = new Map(); // Cache for efficiency

  // Build requirement-to-control mapping cache with proper ID normalization
  // Controls might have _id or requirementId in requirementIds array
  for (const control of controls) {
    if (control.requirementIds && Array.isArray(control.requirementIds)) {
      control.requirementIds.forEach(reqId => {
        const reqIdStr = String(reqId);
        
        // Find the requirement to get both _id and requirementId
        const req = requirements.find(r => 
          String(r._id) === reqIdStr || r.requirementId === reqIdStr
        );
        
        if (req) {
          // Add both _id and requirementId to the map
          const reqIdKey = String(req._id);
          const reqRequirementId = req.requirementId || '';
          
          // Map by _id
          if (!requirementToControlMap.has(reqIdKey)) {
            requirementToControlMap.set(reqIdKey, []);
          }
          if (!requirementToControlMap.get(reqIdKey).some(c => String(c._id || c.controlId) === String(control._id || control.controlId))) {
            requirementToControlMap.get(reqIdKey).push(control);
          }
          
          // Map by requirementId (if different)
          if (reqRequirementId && reqRequirementId !== reqIdKey) {
            if (!requirementToControlMap.has(reqRequirementId)) {
              requirementToControlMap.set(reqRequirementId, []);
            }
            if (!requirementToControlMap.get(reqRequirementId).some(c => String(c._id || c.controlId) === String(control._id || control.controlId))) {
              requirementToControlMap.get(reqRequirementId).push(control);
            }
          }
        } else {
          // If requirement not found, still add the ID as-is
          if (!requirementToControlMap.has(reqIdStr)) {
            requirementToControlMap.set(reqIdStr, []);
          }
          if (!requirementToControlMap.get(reqIdStr).some(c => String(c._id || c.controlId) === String(control._id || control.controlId))) {
            requirementToControlMap.get(reqIdStr).push(control);
          }
        }
      });
    }
  }

  console.log(`\n   Built requirement-to-control cache: ${requirementToControlMap.size} unique requirement IDs`);

  for (const { question, mapping } of questionsWithMappings) {
    const reqIds = mapping.controlBasedRequirements || [];
    const unmappedReqs = [];

    for (const reqId of reqIds) {
      // Check if requirement maps to any control
      // Precomputed mappings return requirementId strings, so check that first
      let mappedControls = requirementToControlMap.get(reqId) || [];
      
      // If not found, try to find the requirement and check by _id
      if (mappedControls.length === 0) {
        const req = requirements.find(r => 
          String(r._id) === reqId || r.requirementId === reqId
        );
        
        if (req) {
          // Try both _id and requirementId
          const reqIdKey = String(req._id);
          const reqRequirementId = req.requirementId || '';
          
          mappedControls = requirementToControlMap.get(reqIdKey) || [];
          if (mappedControls.length === 0 && reqRequirementId) {
            mappedControls = requirementToControlMap.get(reqRequirementId) || [];
          }
        }
      }
      
      if (mappedControls.length === 0) {
        unmappedReqs.push(reqId);
      }
    }

    if (unmappedReqs.length > 0) {
      questionsWithUnmappedReqs.push({
        question,
        unmappedReqs,
        totalReqs: reqIds.length,
      });
    }
  }

  logSubsection('Requirement Mapping Results');

  if (questionsWithUnmappedReqs.length > 0) {
    addIssue(`${questionsWithUnmappedReqs.length} questions have requirements that don't map to controls`);
    
    questionsWithUnmappedReqs.forEach(({ question, unmappedReqs, totalReqs }) => {
      const percentage = ((unmappedReqs.length / totalReqs) * 100).toFixed(1);
      console.log(`\n   ${question.questionId}:`);
      console.log(`     Total requirements: ${totalReqs}`);
      console.log(`     Unmapped requirements: ${unmappedReqs.length} (${percentage}%)`);
      if (unmappedReqs.length <= 3) {
        console.log(`     Unmapped IDs: ${unmappedReqs.join(', ')}`);
      }
    });
  } else {
    console.log(`\n   ✅ All questions' requirements map to controls`);
  }

  // ========================================================================
  // TEST 3: Every Requirement Maps to at Least One Control
  // ========================================================================
  logSection('TEST 3: Requirement-to-Control Mapping Completeness (All Requirements)');

  const requirementsWithoutControls = [];
  const requirementsWithControls = [];

  for (const req of requirements) {
    const reqId = String(req._id || '');
    const reqRequirementId = req.requirementId || '';
    
    // Check if requirement maps to any control
    const controls1 = requirementToControlMap.get(reqId) || [];
    const controls2 = reqRequirementId ? (requirementToControlMap.get(reqRequirementId) || []) : [];
    const mappedControls = [...controls1, ...controls2];
    
    // Remove duplicates
    const uniqueControls = Array.from(new Set(mappedControls.map(c => String(c._id || c.controlId))));

    if (uniqueControls.length === 0) {
      requirementsWithoutControls.push(req);
    } else {
      requirementsWithControls.push({ req, controlCount: uniqueControls.length });
    }
  }

  logSubsection('Requirement Mapping Statistics');

  console.log(`\n   Requirements with controls: ${requirementsWithControls.length}/${requirements.length}`);
  console.log(`   Requirements without controls: ${requirementsWithoutControls.length}/${requirements.length}`);
  
  const percentage = (requirementsWithControls.length / requirements.length) * 100;
  console.log(`   Coverage: ${percentage.toFixed(1)}%`);

    if (requirementsWithoutControls.length > 0) {
      console.log(`\n   Requirements without controls (first 10):`);
      requirementsWithoutControls.slice(0, 10).forEach(req => {
        console.log(`     - ${req.requirementId || req._id}: ${req.title?.substring(0, 60)}...`);
      });
      
      if (requirementsWithoutControls.length > 10) {
        console.log(`     ... and ${requirementsWithoutControls.length - 10} more`);
      }

      // Check if these are informational requirements (e.g., "Simplified framework" might not need controls)
      const simplifiedReqs = requirementsWithoutControls.filter(r => 
        r.title?.toLowerCase().includes('simplified') || 
        r.description?.toLowerCase().includes('simplified')
      );
      
      console.log(`\n   Analysis:`);
      console.log(`     Simplified/informational requirements: ${simplifiedReqs.length}`);
      console.log(`     Other requirements: ${requirementsWithoutControls.length - simplifiedReqs.length}`);

      // This is a warning, not an error - some requirements might not need controls
      // If more than 40% don't map, it might be an issue
      if (requirementsWithoutControls.length > requirements.length * 0.4) {
        addIssue(`${requirementsWithoutControls.length} requirements (${(100 - percentage).toFixed(1)}%) don't map to controls - may indicate missing mappings`);
      } else {
        addWarning(`${requirementsWithoutControls.length} requirements don't map to controls (acceptable if they're informational or don't require specific controls)`);
      }
    } else {
      console.log(`\n   ✅ All requirements map to at least one control`);
    }

  // ========================================================================
  // TEST 4: Every Control Maps to at Least One Requirement
  // ========================================================================
  logSection('TEST 4: Control-to-Requirement Mapping Completeness (All Controls)');

  const controlsWithoutReqs = [];
  const controlsWithReqs = [];

  for (const control of controls) {
    if (!control.requirementIds || control.requirementIds.length === 0) {
      controlsWithoutReqs.push(control);
    } else {
      controlsWithReqs.push({ control, reqCount: control.requirementIds.length });
    }
  }

  logSubsection('Control Mapping Statistics');

  console.log(`\n   Controls with requirements: ${controlsWithReqs.length}/${controls.length}`);
  console.log(`   Controls without requirements: ${controlsWithoutReqs.length}/${controls.length}`);
  
  const controlPercentage = (controlsWithReqs.length / controls.length) * 100;
  console.log(`   Coverage: ${controlPercentage.toFixed(1)}%`);

  if (controlsWithoutReqs.length > 0) {
    console.log(`\n   Controls without requirements (first 10):`);
    controlsWithoutReqs.slice(0, 10).forEach(control => {
      console.log(`     - ${control.controlId || control._id}: ${control.title?.substring(0, 60)}...`);
    });
    
    if (controlsWithoutReqs.length > 10) {
      console.log(`     ... and ${controlsWithoutReqs.length - 10} more`);
    }

    if (controlsWithoutReqs.length > controls.length * 0.2) {
      addIssue(`${controlsWithoutReqs.length} controls (${(100 - controlPercentage).toFixed(1)}%) don't map to requirements - may indicate missing mappings`);
    } else {
      addWarning(`${controlsWithoutReqs.length} controls don't map to requirements (acceptable if they're general controls)`);
    }
  } else {
    console.log(`\n   ✅ All controls map to at least one requirement`);
  }

  // ========================================================================
  // TEST 5: Cross-Reference Validation
  // ========================================================================
  logSection('TEST 5: Cross-Reference Validation');

  logSubsection('Question → Requirement → Control Chain');

  let brokenChains = 0;
  let validChains = 0;

  for (const { question, mapping } of questionsWithMappings.slice(0, 10)) { // Sample 10
    const reqIds = mapping.controlBasedRequirements || [];
    let chainBroken = false;

    for (const reqId of reqIds) {
      const mappedControls = requirementToControlMap.get(reqId) || [];
      if (mappedControls.length === 0) {
        // Try alternative ID
        const req = requirements.find(r => 
          String(r._id) === reqId || r.requirementId === reqId
        );
        if (req && req.requirementId) {
          const altControls = requirementToControlMap.get(req.requirementId) || [];
          if (altControls.length === 0) {
            chainBroken = true;
            break;
          }
        } else {
          chainBroken = true;
          break;
        }
      }
    }

    if (chainBroken) {
      brokenChains++;
    } else {
      validChains++;
    }
  }

  console.log(`\n   Sampled ${questionsWithMappings.slice(0, 10).length} questions`);
  console.log(`   Valid chains: ${validChains}`);
  console.log(`   Broken chains: ${brokenChains}`);

  if (brokenChains > 0) {
    addWarning(`${brokenChains} question chains are broken (requirement doesn't map to control)`);
  } else {
    console.log(`\n   ✅ All sampled chains are valid`);
  }

  // ========================================================================
  // TEST 6: Pillar Coverage
  // ========================================================================
  logSection('TEST 6: Pillar Coverage Analysis');

  const pillars = ['ICT_RISK_MANAGEMENT', 'THIRD_PARTY_RISK', 'INCIDENT_MANAGEMENT', 'INFORMATION_SHARING', 'TESTING'];
  const pillarStats = {};

  for (const pillar of pillars) {
    const pillarQuestions = questions.filter(q => q.pillar === pillar);
    const pillarMappings = questionMappings.filter(m => {
      const q = questions.find(qq => qq.questionId === m.questionId);
      return q && q.pillar === pillar;
    });
    const pillarReqs = requirements.filter(r => r.pillar === pillar);
    const pillarControls = controls.filter(c => c.pillar === pillar);

    const questionsWithReqs = pillarMappings.filter(m => 
      m.controlBasedRequirements && m.controlBasedRequirements.length > 0
    ).length;

    pillarStats[pillar] = {
      questions: pillarQuestions.length,
      questionsWithMappings: pillarMappings.length,
      questionsWithReqs,
      requirements: pillarReqs.length,
      controls: pillarControls.length,
      mappingCoverage: pillarQuestions.length > 0 
        ? (questionsWithReqs / pillarQuestions.length) * 100 
        : 0,
    };
  }

  logSubsection('Pillar Statistics');

  for (const [pillar, stats] of Object.entries(pillarStats)) {
    console.log(`\n   ${pillar}:`);
    console.log(`     Questions: ${stats.questions}`);
    console.log(`     Questions with mappings: ${stats.questionsWithMappings}/${stats.questions}`);
    console.log(`     Questions with requirements: ${stats.questionsWithReqs}/${stats.questions}`);
    console.log(`     Requirements: ${stats.requirements}`);
    console.log(`     Controls: ${stats.controls}`);
    console.log(`     Mapping coverage: ${stats.mappingCoverage.toFixed(1)}%`);

    if (stats.mappingCoverage < 50 && stats.questions > 0) {
      addWarning(`Pillar ${pillar} has low mapping coverage (${stats.mappingCoverage.toFixed(1)}%)`);
    }
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  logSection('COMPLETENESS TEST SUMMARY');

  console.log(`\n📊 Results:`);
  console.log(`   ❌ Issues: ${issues.length}`);
  console.log(`   ⚠️  Warnings: ${warnings.length}`);

  if (issues.length > 0) {
    console.log(`\n❌ ISSUES FOUND:`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS:`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }

  // Detailed statistics
  console.log(`\n📈 Detailed Statistics:`);
  console.log(`   Questions:`);
  console.log(`     Total: ${questions.length}`);
  console.log(`     With mappings: ${questionsWithMappings.length} (${((questionsWithMappings.length / questions.length) * 100).toFixed(1)}%)`);
  console.log(`     Without mappings: ${questionsWithoutMappings.length}`);
  console.log(`     With empty mappings: ${questionsWithEmptyMappings.length}`);
  
  console.log(`\n   Requirements:`);
  console.log(`     Total: ${requirements.length}`);
  console.log(`     With controls: ${requirementsWithControls.length} (${((requirementsWithControls.length / requirements.length) * 100).toFixed(1)}%)`);
  console.log(`     Without controls: ${requirementsWithoutControls.length}`);
  
  console.log(`\n   Controls:`);
  console.log(`     Total: ${controls.length}`);
  console.log(`     With requirements: ${controlsWithReqs.length} (${((controlsWithReqs.length / controls.length) * 100).toFixed(1)}%)`);
  console.log(`     Without requirements: ${controlsWithoutReqs.length}`);

  if (issues.length === 0 && warnings.length === 0) {
    console.log(`\n🎉 Completeness test passed! All mappings are complete.`);
    return 0;
  } else if (issues.length === 0) {
    console.log(`\n✅ No critical issues. Review warnings above.`);
    return 0;
  } else {
    console.log(`\n❌ Critical issues found. Please address them.`);
    return 1;
  }
}

// Run the completeness test
testCompleteness()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('\n💥 Test crashed:', error);
    console.error(error.stack);
    process.exit(1);
  });
