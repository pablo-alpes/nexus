/**
 * Chilean Privacy Completeness Test: Verify ALL Questions and Requirements are Mapped
 * 
 * Ensures:
 * 1. Every Chilean Privacy question has a precomputed mapping
 * 2. Every question's requirements map to controls
 * 3. Every requirement maps to at least one control
 * 4. Every control maps to at least one requirement
 * 
 * Usage: node scripts/test-chilean-privacy-completeness.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/local-db');
const ISO27701_CONTROLS_PATH = path.join(__dirname, '../data/iso27701-controls.json');

// Chilean Privacy pillars
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

async function testChileanPrivacyCompleteness() {
  console.log('\n🔍 Chilean Privacy Matching Engine Completeness Test');
  console.log('Verifying ALL questions and requirements are properly mapped\n');

  // Load all data
  const questions = readCollection('Question');
  const requirements = readCollection('Requirement');
  const controls = readCollection('Control');
  const questionMappings = readCollection('QuestionMapping');

  // Filter for Chilean Privacy
  const chileQuestions = questions.filter(q => 
    q.questionId?.startsWith('Q-PRIV-') || 
    CHILEAN_PRIVACY_PILLARS.includes(q.pillar)
  );
  
  // Also check DORARequirement for Chilean Privacy (stored with CHILE- prefix)
  const doraRequirements = readCollection('DORARequirement');
  const chileRequirementsFromDORA = doraRequirements.filter(r => 
    r.requirementId?.startsWith('CHILE-')
  );
  
  // Combine requirements from both sources
  const chileRequirements = [
    ...requirements.filter(r => 
      r.regulationType === 'CHILEAN_PRIVACY' ||
      r.requirementId?.startsWith('CHILE-REQ-')
    ),
    ...chileRequirementsFromDORA
  ];

  // Load ISO 27701 controls
  let iso27701Controls = [];
  if (fs.existsSync(ISO27701_CONTROLS_PATH)) {
    const isoData = JSON.parse(fs.readFileSync(ISO27701_CONTROLS_PATH, 'utf8'));
    iso27701Controls = isoData.controls || [];
  }

  console.log(`📊 Data Loaded:`);
  console.log(`   Total Questions: ${questions.length}`);
  console.log(`   Chilean Privacy Questions: ${chileQuestions.length}`);
  console.log(`   Chilean Privacy Requirements: ${chileRequirements.length}`);
  console.log(`   Controls: ${controls.length}`);
  console.log(`   ISO 27701 Controls: ${iso27701Controls.length}`);
  console.log(`   Question Mappings: ${questionMappings.length}`);

  if (chileQuestions.length === 0) {
    addIssue('No Chilean Privacy questions found! Run create-chilean-privacy-questionnaire.js first.');
    return;
  }

  if (chileRequirements.length === 0) {
    addIssue('No Chilean Privacy requirements found! Run import-chilean-privacy-requirements.js first.');
    return;
  }

  // ========================================================================
  // TEST 1: Every Question Has a Mapping
  // ========================================================================
  logSection('TEST 1: Question-to-Requirement Mapping Completeness');

  const questionsWithoutMappings = [];
  const questionsWithEmptyMappings = [];
  const questionsWithMappings = [];

  for (const question of chileQuestions) {
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

  console.log(`\n   Questions with mappings: ${questionsWithMappings.length}/${chileQuestions.length}`);
  console.log(`   Questions without mappings: ${questionsWithoutMappings.length}`);
  console.log(`   Questions with empty mappings: ${questionsWithEmptyMappings.length}`);

  if (questionsWithoutMappings.length > 0) {
    addIssue(`${questionsWithoutMappings.length} questions have NO precomputed mappings`);
    console.log(`\n   Questions without mappings:`);
    questionsWithoutMappings.slice(0, 10).forEach(q => {
      console.log(`     - ${q.questionId}: ${q.text?.substring(0, 60)}...`);
    });
    if (questionsWithoutMappings.length > 10) {
      console.log(`     ... and ${questionsWithoutMappings.length - 10} more`);
    }
  }

  if (questionsWithEmptyMappings.length > 0) {
    addWarning(`${questionsWithEmptyMappings.length} questions have EMPTY mappings (no requirements)`);
    console.log(`\n   Questions with empty mappings:`);
    questionsWithEmptyMappings.slice(0, 5).forEach(({ question }) => {
      console.log(`     - ${question.questionId}: ${question.text?.substring(0, 60)}...`);
    });
  }

  // ========================================================================
  // TEST 2: Requirements Map to Controls
  // ========================================================================
  logSection('TEST 2: Requirement-to-Control Mapping');

  const requirementsWithoutControls = [];
  const requirementsWithControls = [];

  for (const req of chileRequirements) {
    const reqId = req.requirementId || String(req._id);
    
    // Check database controls
    const dbControls = controls.filter(c => {
      if (!c.requirementIds || !Array.isArray(c.requirementIds)) return false;
      return c.requirementIds.some(rId => 
        String(rId) === String(req._id) || 
        String(rId) === reqId ||
        (typeof rId === 'string' && rId.includes(reqId))
      );
    });

    // Check ISO 27701 controls
    const isoControls = iso27701Controls.filter(c => {
      if (c.chileRequirements && Array.isArray(c.chileRequirements)) {
        return c.chileRequirements.includes(reqId);
      }
      return false;
    });

    if (dbControls.length === 0 && isoControls.length === 0) {
      requirementsWithoutControls.push(req);
    } else {
      requirementsWithControls.push({
        requirement: req,
        dbControls: dbControls.length,
        isoControls: isoControls.length,
      });
    }
  }

  logSubsection('Requirement Mapping Coverage');

  console.log(`\n   Requirements with controls: ${requirementsWithControls.length}/${chileRequirements.length}`);
  console.log(`   Requirements without controls: ${requirementsWithoutControls.length}`);

  if (requirementsWithoutControls.length > 0) {
    addIssue(`${requirementsWithoutControls.length} requirements map to NO controls`);
    console.log(`\n   Requirements without controls:`);
    requirementsWithoutControls.slice(0, 10).forEach(req => {
      console.log(`     - ${req.requirementId}: ${req.title?.substring(0, 60)}...`);
    });
    if (requirementsWithoutControls.length > 10) {
      console.log(`     ... and ${requirementsWithoutControls.length - 10} more`);
    }
  }

  // ========================================================================
  // TEST 3: Controls Map to Requirements
  // ========================================================================
  logSection('TEST 3: Control-to-Requirement Mapping');

  // Get controls for Chilean Privacy pillars
  const chileControls = controls.filter(c => 
    CHILEAN_PRIVACY_PILLARS.includes(c.pillar)
  );

  const controlsWithoutRequirements = [];
  const controlsWithRequirements = [];

  for (const control of chileControls) {
    if (!control.requirementIds || control.requirementIds.length === 0) {
      controlsWithoutRequirements.push(control);
    } else {
      // Verify at least one requirement exists
      const hasValidReq = control.requirementIds.some(reqId => {
        return chileRequirements.some(req => 
          String(req._id) === String(reqId) || 
          req.requirementId === String(reqId)
        );
      });
      
      if (!hasValidReq) {
        controlsWithoutRequirements.push(control);
      } else {
        controlsWithRequirements.push(control);
      }
    }
  }

  // Check ISO 27701 controls
  const isoControlsWithoutReqs = [];
  const isoControlsWithReqs = [];

  for (const control of iso27701Controls) {
    if (!control.chileRequirements || control.chileRequirements.length === 0) {
      isoControlsWithoutReqs.push(control);
    } else {
      // Verify requirements exist
      const validReqs = control.chileRequirements.filter(reqId => 
        chileRequirements.some(req => req.requirementId === reqId)
      );
      
      if (validReqs.length === 0) {
        isoControlsWithoutReqs.push(control);
      } else {
        isoControlsWithReqs.push(control);
      }
    }
  }

  logSubsection('Control Mapping Coverage');

  console.log(`\n   Database Controls with requirements: ${controlsWithRequirements.length}/${chileControls.length}`);
  console.log(`   Database Controls without requirements: ${controlsWithoutRequirements.length}`);
  console.log(`   ISO 27701 Controls with requirements: ${isoControlsWithReqs.length}/${iso27701Controls.length}`);
  console.log(`   ISO 27701 Controls without requirements: ${isoControlsWithoutReqs.length}`);

  if (controlsWithoutRequirements.length > 0) {
    addWarning(`${controlsWithoutRequirements.length} database controls have NO requirements`);
  }

  if (isoControlsWithoutReqs.length > 0) {
    addWarning(`${isoControlsWithoutReqs.length} ISO 27701 controls have NO requirements mapped`);
  }

  // ========================================================================
  // TEST 4: Pillar Coverage
  // ========================================================================
  logSection('TEST 4: Pillar Coverage Analysis');

  const pillarStats = {};

  CHILEAN_PRIVACY_PILLARS.forEach(pillar => {
    const pillarQuestions = chileQuestions.filter(q => q.pillar === pillar);
    const pillarRequirements = chileRequirements.filter(r => r.pillar === pillar);
    const pillarControls = controls.filter(c => c.pillar === pillar);
    const pillarIsoControls = iso27701Controls.filter(c => c.pillar === pillar);
    
    const pillarMappings = questionMappings.filter(m => {
      const q = chileQuestions.find(qq => qq.questionId === m.questionId);
      return q && q.pillar === pillar;
    });

    pillarStats[pillar] = {
      questions: pillarQuestions.length,
      requirements: pillarRequirements.length,
      controls: pillarControls.length,
      isoControls: pillarIsoControls.length,
      mappings: pillarMappings.length,
      questionsWithMappings: pillarMappings.filter(m => 
        m.controlBasedRequirements && m.controlBasedRequirements.length > 0
      ).length,
    };
  });

  logSubsection('Pillar Statistics');

  CHILEAN_PRIVACY_PILLARS.forEach(pillar => {
    const stats = pillarStats[pillar];
    console.log(`\n   ${pillar}:`);
    console.log(`     Questions: ${stats.questions} (${stats.questionsWithMappings} with mappings)`);
    console.log(`     Requirements: ${stats.requirements}`);
    console.log(`     Controls: ${stats.controls} (DB) + ${stats.isoControls} (ISO 27701)`);
    
    if (stats.questions > 0 && stats.questionsWithMappings === 0) {
      addIssue(`Pillar ${pillar} has ${stats.questions} questions but NO mappings`);
    }
    
    if (stats.requirements === 0) {
      addWarning(`Pillar ${pillar} has NO requirements`);
    }
  });

  // ========================================================================
  // SUMMARY
  // ========================================================================
  logSection('SUMMARY');

  const totalIssues = issues.length;
  const totalWarnings = warnings.length;

  console.log(`\n   ✅ Questions with mappings: ${questionsWithMappings.length}/${chileQuestions.length}`);
  console.log(`   ✅ Requirements with controls: ${requirementsWithControls.length}/${chileRequirements.length}`);
  console.log(`   ✅ Controls with requirements: ${controlsWithRequirements.length + isoControlsWithReqs.length}/${chileControls.length + iso27701Controls.length}`);

  if (totalIssues === 0 && totalWarnings === 0) {
    console.log(`\n   🎉 All tests passed! Chilean Privacy matching engine is complete.`);
  } else {
    console.log(`\n   ⚠️  Found ${totalIssues} issues and ${totalWarnings} warnings`);
    
    if (totalIssues > 0) {
      console.log(`\n   Issues to fix:`);
      issues.forEach((issue, idx) => {
        console.log(`     ${idx + 1}. ${issue}`);
      });
    }
    
    if (totalWarnings > 0) {
      console.log(`\n   Warnings to review:`);
      warnings.forEach((warning, idx) => {
        console.log(`     ${idx + 1}. ${warning}`);
      });
    }
  }

  console.log('\n');
}

// Run the test
testChileanPrivacyCompleteness().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
