/**
 * Comprehensive comparison test between:
 * 1. Current keyword-based matching approach
 * 2. Proposed explicit mapping approach
 * 
 * Analyzes:
 * - Question → Requirement mappings (current vs explicit)
 * - Requirement → Control mappings (coverage)
 * - Gaps and missing mappings
 * - ISO standards coverage
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/local-db');
const ISO_CONTROLS_PATH = path.join(__dirname, '../data/iso27002-controls.json');

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

function extractKeywords(text) {
  return text.toLowerCase().split(' ').filter(w => w.length > 3);
}

function keywordMatch(questionText, requirementText) {
  const keywords = extractKeywords(questionText);
  const reqText = `${requirementText}`.toLowerCase();
  return keywords.some(keyword => reqText.includes(keyword));
}

async function compareMatchingApproaches() {
  console.log('🔍 Comparing Matching Approaches\n');
  console.log('='.repeat(80));
  console.log('');

  // Load all data
  console.log('📊 Loading data...');
  let questions = readCollection('Question');
  const requirements = readCollection('DORARequirement');
  const controls = readCollection('Control');
  
  // Deduplicate questions by questionId (keep first occurrence)
  const seenQuestionIds = new Set();
  const uniqueQuestions = [];
  questions.forEach(q => {
    if (!seenQuestionIds.has(q.questionId)) {
      seenQuestionIds.add(q.questionId);
      uniqueQuestions.push(q);
    }
  });
  
  if (questions.length !== uniqueQuestions.length) {
    console.log(`⚠️  Found ${questions.length - uniqueQuestions.length} duplicate questions, using ${uniqueQuestions.length} unique questions`);
  }
  questions = uniqueQuestions;
  
  if (!fs.existsSync(ISO_CONTROLS_PATH)) {
    console.error(`❌ ISO controls file not found: ${ISO_CONTROLS_PATH}`);
    return;
  }
  
  const isoControls = JSON.parse(fs.readFileSync(ISO_CONTROLS_PATH, 'utf8')).controls;

  console.log(`   Questions: ${questions.length}`);
  console.log(`   Requirements: ${requirements.length}`);
  console.log(`   Controls (DB): ${controls.length}`);
  console.log(`   Controls (ISO): ${isoControls.length}`);
  console.log('');

  if (questions.length === 0 || requirements.length === 0) {
    console.error('❌ Missing data! Please ensure questions and requirements are loaded.');
    return;
  }

  // Create lookup maps
  const requirementMap = new Map(
    requirements.map(r => [String(r._id || r.requirementId), r])
  );
  const requirementIdMap = new Map(
    requirements.map(r => [r.requirementId, String(r._id || r.requirementId)])
  );
  const controlMap = new Map(
    controls.map(c => [c.controlId, c])
  );

  // Build requirement → control mapping from ISO controls
  const reqToControlMap = new Map();
  isoControls.forEach((control) => {
    if (control.doraRequirements && Array.isArray(control.doraRequirements)) {
      control.doraRequirements.forEach((reqId) => {
        if (!reqToControlMap.has(reqId)) {
          reqToControlMap.set(reqId, new Set());
        }
        reqToControlMap.get(reqId).add(control.controlId);
      });
    }
  });

  // Build control → requirement mapping from DB controls
  const controlToReqMap = new Map();
  controls.forEach((control) => {
    const controlId = control.controlId;
    if (control.requirementIds && Array.isArray(control.requirementIds)) {
      control.requirementIds.forEach((reqId) => {
        const reqIdStr = String(reqId);
        if (!controlToReqMap.has(controlId)) {
          controlToReqMap.set(controlId, new Set());
        }
        controlToReqMap.get(controlId).add(reqIdStr);
      });
    }
  });

  // Analysis results
  const analysisResults = [];
  const statistics = {
    totalQuestions: questions.length,
    questionsWithKeywordMatches: 0,
    questionsWithExplicitMappings: 0,
    questionsWithNoMappings: 0,
    totalRequirements: requirements.length,
    requirementsWithControls: 0,
    requirementsWithoutControls: 0,
    totalControls: controls.length,
    controlsWithRequirements: 0,
    controlsWithoutRequirements: 0,
    keywordMatches: 0,
    explicitMatches: 0,
    ambiguousMatches: 0,
  };

  console.log('🔬 Analyzing each question...\n');

  // Analyze each question
  for (const question of questions) {
    const result = {
      questionId: question.questionId,
      questionText: question.text,
      pillar: question.pillar || 'UNKNOWN',
      currentApproach: {
        keywordMatching: {
          requirementsFound: 0,
          requirements: [],
          method: 'none',
        },
        explicitMappings: {
          requirementsFound: 0,
          requirements: [],
          method: 'none',
        },
      },
      explicitApproach: {
        requirementsFromControls: [],
        requirementsFromISO: [],
        totalRequirements: 0,
      },
      gaps: {
        missingInCurrent: [],
        missingInExplicit: [],
        ambiguousMatches: [],
      },
    };

    // CURRENT APPROACH ANALYSIS
    // 1. Keyword matching (simulate what happens in questionnaire response route)
    const pillarRequirements = requirements.filter(
      (r) => r.pillar === question.pillar
    );
    const keywordMatchedReqs = pillarRequirements.filter((req) => {
      const reqText = `${req.description || ''} ${req.title || ''}`;
      return keywordMatch(question.text, reqText);
    });

    result.currentApproach.keywordMatching = {
      requirementsFound: keywordMatchedReqs.length,
      requirements: keywordMatchedReqs.map((r) => r.requirementId),
      method: keywordMatchedReqs.length > 0 ? 'keyword' : 'none',
    };

    if (keywordMatchedReqs.length > 0) {
      statistics.questionsWithKeywordMatches++;
      statistics.keywordMatches += keywordMatchedReqs.length;
    }

    // 2. Explicit mappings from question options
    const yesOption = question.options?.find((o) => o.value === 'yes');
    const noOption = question.options?.find((o) => o.value === 'no');
    
    let explicitReqIds = [];
    if (yesOption?.applicableControls) {
      explicitReqIds = yesOption.applicableControls.map((id) => String(id));
    }
    if (noOption?.applicableControls) {
      explicitReqIds = [
        ...explicitReqIds,
        ...noOption.applicableControls.map((id) => String(id)),
      ];
    }

    // Filter to actual requirement IDs
    const explicitReqs = explicitReqIds
      .map((id) => {
        // Check if it's a requirement ID
        const req = requirementMap.get(id);
        if (req) return req.requirementId;
        // Check if it's a requirementId string
        const reqById = requirements.find((r) => r.requirementId === id);
        return reqById?.requirementId;
      })
      .filter(Boolean);

    result.currentApproach.explicitMappings = {
      requirementsFound: explicitReqs.length,
      requirements: explicitReqs,
      method: explicitReqs.length > 0 ? 'explicit' : 'none',
    };

    if (explicitReqs.length > 0) {
      statistics.questionsWithExplicitMappings++;
      statistics.explicitMatches += explicitReqs.length;
    }

    if (keywordMatchedReqs.length === 0 && explicitReqs.length === 0) {
      statistics.questionsWithNoMappings++;
    }

    // EXPLICIT APPROACH ANALYSIS
    // Find requirements through controls that map to this question's pillar
    const pillarControls = controls.filter((c) => c.pillar === question.pillar);
    const reqsFromControls = new Set();
    
    pillarControls.forEach((control) => {
      if (control.requirementIds && Array.isArray(control.requirementIds)) {
        control.requirementIds.forEach((reqId) => {
          const req = requirementMap.get(String(reqId));
          if (req) {
            reqsFromControls.add(req.requirementId);
          }
        });
      }
    });

    // Find requirements from ISO controls
    const pillarISOControls = isoControls.filter(
      (c) => c.pillar === question.pillar
    );
    const reqsFromISO = new Set();
    
    pillarISOControls.forEach((control) => {
      if (control.doraRequirements && Array.isArray(control.doraRequirements)) {
        control.doraRequirements.forEach((reqId) => {
          reqsFromISO.add(reqId);
        });
      }
    });

    result.explicitApproach.requirementsFromControls = Array.from(reqsFromControls);
    result.explicitApproach.requirementsFromISO = Array.from(reqsFromISO);
    result.explicitApproach.totalRequirements = new Set([
      ...reqsFromControls,
      ...reqsFromISO,
    ]).size;

    // GAP ANALYSIS
    const currentReqs = new Set([
      ...result.currentApproach.keywordMatching.requirements,
      ...result.currentApproach.explicitMappings.requirements,
    ]);
    const explicitReqsSet = new Set([
      ...result.explicitApproach.requirementsFromControls,
      ...result.explicitApproach.requirementsFromISO,
    ]);

    // Requirements in explicit but not in current
    result.gaps.missingInCurrent = Array.from(explicitReqsSet).filter(
      (r) => !currentReqs.has(r)
    );

    // Requirements in current but not in explicit (might be false positives)
    result.gaps.missingInExplicit = Array.from(currentReqs).filter(
      (r) => !explicitReqsSet.has(r)
    );

    // Ambiguous: in both keyword and explicit but different sets
    if (
      result.currentApproach.keywordMatching.requirements.length > 0 &&
      result.currentApproach.explicitMappings.requirements.length > 0
    ) {
      const keywordSet = new Set(result.currentApproach.keywordMatching.requirements);
      const explicitSet = new Set(result.currentApproach.explicitMappings.requirements);
      const intersection = Array.from(keywordSet).filter((r) => explicitSet.has(r));
      const union = new Set([...keywordSet, ...explicitSet]);
      if (intersection.length < union.size) {
        result.gaps.ambiguousMatches = Array.from(union);
        statistics.ambiguousMatches++;
      }
    }

    analysisResults.push(result);
  }

  // Requirement → Control mapping analysis
  console.log('📋 Analyzing Requirement → Control mappings...\n');
  
  const reqControlAnalysis = [];
  requirements.forEach((req) => {
    const reqId = req.requirementId;
    const dbId = String(req._id || req.requirementId);
    
    // Find controls from ISO file
    const isoControlsForReq = isoControls.filter(
      (c) => c.doraRequirements && c.doraRequirements.includes(reqId)
    );
    
    // Find controls from DB
    const dbControlsForReq = controls.filter((c) => {
      if (!c.requirementIds) return false;
      return c.requirementIds.some((rid) => String(rid) === dbId);
    });

    const hasControls = isoControlsForReq.length > 0 || dbControlsForReq.length > 0;
    
    if (hasControls) {
      statistics.requirementsWithControls++;
    } else {
      statistics.requirementsWithoutControls++;
      reqControlAnalysis.push({
        requirementId: reqId,
        title: req.title,
        pillar: req.pillar,
        controlsFromISO: isoControlsForReq.length,
        controlsFromDB: dbControlsForReq.length,
      });
    }
  });

  // Control → Requirement mapping analysis
  console.log('📋 Analyzing Control → Requirement mappings...\n');
  
  const controlReqAnalysis = [];
  controls.forEach((control) => {
    const hasReqs = control.requirementIds && control.requirementIds.length > 0;
    
    if (hasReqs) {
      statistics.controlsWithRequirements++;
    } else {
      statistics.controlsWithoutRequirements++;
      controlReqAnalysis.push({
        controlId: control.controlId,
        title: control.title,
        pillar: control.pillar,
      });
    }
  });

  // Print comprehensive report
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE COMPARISON REPORT');
  console.log('='.repeat(80));
  console.log('');

  // Overall Statistics
  console.log('📈 OVERALL STATISTICS');
  console.log('─'.repeat(80));
  console.log(`Total Questions: ${statistics.totalQuestions}`);
  console.log(`  ✓ With keyword matches: ${statistics.questionsWithKeywordMatches} (${((statistics.questionsWithKeywordMatches / statistics.totalQuestions) * 100).toFixed(1)}%)`);
  console.log(`  ✓ With explicit mappings: ${statistics.questionsWithExplicitMappings} (${((statistics.questionsWithExplicitMappings / statistics.totalQuestions) * 100).toFixed(1)}%)`);
  console.log(`  ✗ With no mappings: ${statistics.questionsWithNoMappings} (${((statistics.questionsWithNoMappings / statistics.totalQuestions) * 100).toFixed(1)}%)`);
  console.log('');
  console.log(`Total Requirements: ${statistics.totalRequirements}`);
  console.log(`  ✓ With controls: ${statistics.requirementsWithControls} (${((statistics.requirementsWithControls / statistics.totalRequirements) * 100).toFixed(1)}%)`);
  console.log(`  ✗ Without controls: ${statistics.requirementsWithoutControls} (${((statistics.requirementsWithoutControls / statistics.totalRequirements) * 100).toFixed(1)}%)`);
  console.log('');
  console.log(`Total Controls: ${statistics.totalControls}`);
  console.log(`  ✓ With requirements: ${statistics.controlsWithRequirements} (${((statistics.controlsWithRequirements / statistics.totalControls) * 100).toFixed(1)}%)`);
  console.log(`  ✗ Without requirements: ${statistics.controlsWithoutRequirements} (${((statistics.controlsWithoutRequirements / statistics.totalControls) * 100).toFixed(1)}%)`);
  console.log('');

  // Matching Method Statistics
  console.log('🔍 MATCHING METHOD STATISTICS');
  console.log('─'.repeat(80));
  console.log(`Keyword matches found: ${statistics.keywordMatches}`);
  console.log(`Explicit matches found: ${statistics.explicitMatches}`);
  console.log(`Ambiguous matches (conflicting keyword vs explicit): ${statistics.ambiguousMatches}`);
  console.log('');

  // Gap Analysis
  console.log('⚠️  GAP ANALYSIS');
  console.log('─'.repeat(80));
  
  const questionsWithGaps = analysisResults.filter(
    (r) => r.gaps.missingInCurrent.length > 0 || r.gaps.missingInExplicit.length > 0
  );
  console.log(`Questions with gaps: ${questionsWithGaps.length} / ${analysisResults.length}`);
  
  const totalMissingInCurrent = analysisResults.reduce(
    (sum, r) => sum + r.gaps.missingInCurrent.length,
    0
  );
  const totalMissingInExplicit = analysisResults.reduce(
    (sum, r) => sum + r.gaps.missingInExplicit.length,
    0
  );
  
  console.log(`Requirements missing in current approach: ${totalMissingInCurrent}`);
  console.log(`Requirements potentially false-positive in current: ${totalMissingInExplicit}`);
  console.log('');

  // Requirements without controls
  if (reqControlAnalysis.length > 0) {
    console.log(`❌ REQUIREMENTS WITHOUT CONTROLS (${reqControlAnalysis.length}):`);
    reqControlAnalysis.slice(0, 10).forEach((req) => {
      console.log(`   - ${req.requirementId}: ${req.title.substring(0, 60)}...`);
    });
    if (reqControlAnalysis.length > 10) {
      console.log(`   ... and ${reqControlAnalysis.length - 10} more`);
    }
    console.log('');
  }

  // Controls without requirements
  if (controlReqAnalysis.length > 0) {
    console.log(`❌ CONTROLS WITHOUT REQUIREMENTS (${controlReqAnalysis.length}):`);
    controlReqAnalysis.slice(0, 10).forEach((ctrl) => {
      console.log(`   - ${ctrl.controlId}: ${ctrl.title.substring(0, 60)}...`);
    });
    if (controlReqAnalysis.length > 10) {
      console.log(`   ... and ${controlReqAnalysis.length - 10} more`);
    }
    console.log('');
  }

  // Detailed question analysis (top 10 with most gaps)
  console.log('🔬 TOP 10 QUESTIONS WITH MOST GAPS');
  console.log('─'.repeat(80));
  const topGaps = analysisResults
    .sort(
      (a, b) =>
        b.gaps.missingInCurrent.length +
        b.gaps.missingInExplicit.length -
        (a.gaps.missingInCurrent.length + a.gaps.missingInExplicit.length)
    )
    .slice(0, 10);

  topGaps.forEach((result, idx) => {
    console.log(`\n${idx + 1}. ${result.questionId}: ${result.questionText.substring(0, 60)}...`);
    console.log(`   Pillar: ${result.pillar}`);
    console.log(`   Current Approach:`);
    console.log(`     - Keyword matching: ${result.currentApproach.keywordMatching.requirementsFound} requirements`);
    console.log(`     - Explicit mappings: ${result.currentApproach.explicitMappings.requirementsFound} requirements`);
    console.log(`   Explicit Approach:`);
    console.log(`     - From controls: ${result.explicitApproach.requirementsFromControls.length} requirements`);
    console.log(`     - From ISO: ${result.explicitApproach.requirementsFromISO.length} requirements`);
    console.log(`   Gaps:`);
    console.log(`     - Missing in current: ${result.gaps.missingInCurrent.length}`);
    console.log(`     - Potentially false in current: ${result.gaps.missingInExplicit.length}`);
  });

  // Save detailed results to file
  const outputDir = path.join(__dirname, '../data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'matching-comparison-results.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalQuestions: questions.length,
          totalRequirements: requirements.length,
          totalControls: controls.length,
        },
        statistics,
        analysisResults,
        requirementsWithoutControls: reqControlAnalysis,
        controlsWithoutRequirements: controlReqAnalysis,
      },
      null,
      2
    )
  );

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Detailed results saved to: ${outputPath}`);
  console.log('='.repeat(80));
}

// Run the comparison
compareMatchingApproaches().catch(console.error);

