/**
 * Question-to-Requirement Mapping Analysis
 * 
 * Tests the hypothesis that questions are:
 * 1. Not properly unique
 * 2. Vastly engaged to several requirements and controls (causing mismatches)
 * 
 * Usage: node scripts/test-question-requirement-mapping.js
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

async function analyzeQuestionRequirementMapping() {
  console.log('\n🔍 Question-to-Requirement Mapping Analysis');
  console.log('Testing hypothesis: Questions may be too broadly mapped\n');

  let issues = [];
  let warnings = [];

  try {
    // Load data
    logSection('STEP 1: Loading Data');
    
    const questions = readCollection('Question');
    const requirements = readCollection('DORARequirement');
    const controls = readCollection('Control');
    const questionMappings = readCollection('QuestionMapping');

    console.log(`✅ Questions: ${questions.length}`);
    console.log(`✅ Requirements: ${requirements.length}`);
    console.log(`✅ Controls: ${controls.length}`);
    console.log(`✅ Question Mappings: ${questionMappings.length}`);

    if (questions.length === 0) {
      throw new Error('No questions found!');
    }

    // ========================================================================
    // TEST 1: Check Question Uniqueness
    // ========================================================================
    logSection('TEST 1: Question Uniqueness Analysis');

    const questionIds = new Set();
    const duplicateQuestionIds = [];
    const duplicateTexts = [];

    // Check for duplicate questionIds
    questions.forEach(q => {
      if (questionIds.has(q.questionId)) {
        duplicateQuestionIds.push(q.questionId);
      } else {
        questionIds.add(q.questionId);
      }
    });

    // Check for duplicate texts
    const textMap = new Map();
    questions.forEach(q => {
      const normalizedText = (q.text || '').toLowerCase().trim();
      if (textMap.has(normalizedText)) {
        duplicateTexts.push({
          questionId: q.questionId,
          text: q.text,
          duplicateOf: textMap.get(normalizedText)
        });
      } else {
        textMap.set(normalizedText, q.questionId);
      }
    });

    console.log(`\n📊 Uniqueness Results:`);
    console.log(`   Unique questionIds: ${questionIds.size}/${questions.length}`);
    console.log(`   Duplicate questionIds: ${duplicateQuestionIds.length}`);
    console.log(`   Duplicate texts: ${duplicateTexts.length}`);

    if (duplicateQuestionIds.length > 0) {
      issues.push(`Found ${duplicateQuestionIds.length} duplicate questionIds!`);
      console.log(`\n   ❌ DUPLICATE QUESTION IDs:`);
      duplicateQuestionIds.forEach(id => {
        console.log(`      - ${id}`);
      });
    } else {
      console.log(`   ✅ All questionIds are unique`);
    }

    if (duplicateTexts.length > 0) {
      warnings.push(`Found ${duplicateTexts.length} questions with duplicate text`);
      console.log(`\n   ⚠️  DUPLICATE QUESTION TEXTS:`);
      duplicateTexts.slice(0, 5).forEach(dup => {
        console.log(`      - ${dup.questionId}: "${dup.text?.substring(0, 60)}..."`);
        console.log(`        (duplicate of: ${dup.duplicateOf})`);
      });
    } else {
      console.log(`   ✅ All question texts are unique`);
    }

    // ========================================================================
    // TEST 2: Analyze Question-to-Requirement Mapping Breadth
    // ========================================================================
    logSection('TEST 2: Question-to-Requirement Mapping Breadth');

    const mappingStats = [];

    for (const question of questions) {
      const mapping = questionMappings.find(m => m.questionId === question.questionId);
      
      const stats = {
        questionId: question.questionId,
        questionText: question.text?.substring(0, 80) || 'N/A',
        pillar: question.pillar || 'N/A',
        controlBasedRequirements: mapping?.controlBasedRequirements?.length || 0,
        totalNlpSimilarities: mapping?.nlpSimilarities?.length || 0,
        highConfidence: mapping?.nlpSimilarities?.filter(s => s.confidence === 'high' && s.isControlBased).length || 0,
        mediumConfidence: mapping?.nlpSimilarities?.filter(s => s.confidence === 'medium' && s.isControlBased).length || 0,
        lowConfidence: mapping?.nlpSimilarities?.filter(s => s.confidence === 'low' && s.isControlBased).length || 0,
        coherence: mapping?.coherenceMetrics?.overallCoherence || 0,
        averageRelevance: mapping?.coherenceMetrics?.averageRelevance || 0,
      };

      // Find controls that map to these requirements
      if (mapping && mapping.controlBasedRequirements) {
        const reqIds = new Set(mapping.controlBasedRequirements);
        const mappedControls = controls.filter(c => {
          if (!c.requirementIds || c.requirementIds.length === 0) return false;
          return c.requirementIds.some(rid => {
            const ridStr = String(rid);
            // Check if requirement ID matches
            return reqIds.has(ridStr) || 
                   requirements.some(r => {
                     const rId = String(r._id || r.requirementId);
                     return (rId === ridStr || r.requirementId === ridStr) && reqIds.has(r.requirementId);
                   });
          });
        });
        stats.mappedControls = mappedControls.length;
      } else {
        stats.mappedControls = 0;
      }

      mappingStats.push(stats);
    }

    // Sort by number of requirements (descending)
    mappingStats.sort((a, b) => b.controlBasedRequirements - a.controlBasedRequirements);

    logSubsection('Top 10 Questions with Most Requirements');

    const top10 = mappingStats.slice(0, 10);
    top10.forEach((stats, index) => {
      console.log(`\n   ${index + 1}. ${stats.questionId}`);
      console.log(`      Text: "${stats.questionText}..."`);
      console.log(`      Pillar: ${stats.pillar}`);
      console.log(`      Control-based Requirements: ${stats.controlBasedRequirements}`);
      console.log(`      Mapped Controls: ${stats.mappedControls}`);
      console.log(`      NLP Similarities: ${stats.totalNlpSimilarities}`);
      console.log(`      High Confidence: ${stats.highConfidence}, Medium: ${stats.mediumConfidence}, Low: ${stats.lowConfidence}`);
      console.log(`      Coherence: ${stats.coherence.toFixed(2)}%`);
      console.log(`      Avg Relevance: ${stats.averageRelevance.toFixed(3)}`);

      // Flag if too many requirements
      if (stats.controlBasedRequirements > 20) {
        issues.push(`Question ${stats.questionId} maps to ${stats.controlBasedRequirements} requirements (too many!)`);
        console.log(`      ⚠️  WARNING: Maps to ${stats.controlBasedRequirements} requirements - may be too broad!`);
      }
    });

    // Calculate statistics
    const avgRequirements = mappingStats.reduce((sum, s) => sum + s.controlBasedRequirements, 0) / mappingStats.length;
    const maxRequirements = Math.max(...mappingStats.map(s => s.controlBasedRequirements));
    const minRequirements = Math.min(...mappingStats.map(s => s.controlBasedRequirements));

    logSubsection('Mapping Statistics');

    console.log(`\n   Average Requirements per Question: ${avgRequirements.toFixed(2)}`);
    console.log(`   Max Requirements: ${maxRequirements}`);
    console.log(`   Min Requirements: ${minRequirements}`);

    const questionsWithManyReqs = mappingStats.filter(s => s.controlBasedRequirements > 15).length;
    const questionsWithFewReqs = mappingStats.filter(s => s.controlBasedRequirements < 3).length;
    const questionsWithNoReqs = mappingStats.filter(s => s.controlBasedRequirements === 0).length;

    console.log(`\n   Questions with >15 requirements: ${questionsWithManyReqs}`);
    console.log(`   Questions with <3 requirements: ${questionsWithFewReqs}`);
    console.log(`   Questions with 0 requirements: ${questionsWithNoReqs}`);

    if (questionsWithManyReqs > 0) {
      warnings.push(`${questionsWithManyReqs} questions map to more than 15 requirements (may be too broad)`);
    }

    // ========================================================================
    // TEST 3: Analyze Requirement-to-Control Mapping
    // ========================================================================
    logSection('TEST 3: Requirement-to-Control Mapping Analysis');

    // For each question, check how many controls it ultimately maps to
    const questionToControls = new Map();

    for (const question of questions) {
      const mapping = questionMappings.find(m => m.questionId === question.questionId);
      if (!mapping || !mapping.controlBasedRequirements) continue;

      const reqIds = new Set(mapping.controlBasedRequirements);
      const mappedControls = controls.filter(c => {
        if (!c.requirementIds || c.requirementIds.length === 0) return false;
        return c.requirementIds.some(rid => {
          const ridStr = String(rid);
          // Try to match requirement ID
          return reqIds.has(ridStr) || 
                 requirements.some(r => {
                   const rId = String(r._id || r.requirementId);
                   return (rId === ridStr || r.requirementId === ridStr) && reqIds.has(r.requirementId);
                 });
        });
      });

      questionToControls.set(question.questionId, {
        question,
        requirements: mapping.controlBasedRequirements.length,
        controls: mappedControls.length,
        controlIds: mappedControls.map(c => c.controlId || c._id)
      });
    }

    logSubsection('Questions with Most Controls');

    const sortedByControls = Array.from(questionToControls.values())
      .sort((a, b) => b.controls - a.controls)
      .slice(0, 10);

    sortedByControls.forEach((item, index) => {
      console.log(`\n   ${index + 1}. ${item.question.questionId}`);
      console.log(`      Text: "${item.question.text?.substring(0, 60)}..."`);
      console.log(`      Requirements: ${item.requirements}`);
      console.log(`      Controls: ${item.controls}`);
      console.log(`      Control IDs: ${item.controlIds.slice(0, 5).join(', ')}${item.controlIds.length > 5 ? '...' : ''}`);

      if (item.controls > 10) {
        issues.push(`Question ${item.question.questionId} maps to ${item.controls} controls (too many!)`);
        console.log(`      ⚠️  WARNING: Maps to ${item.controls} controls - may cause mismatches!`);
      }
    });

    // ========================================================================
    // TEST 4: Check for Overlapping Mappings
    // ========================================================================
    logSection('TEST 4: Overlapping Mappings Analysis');

    // Check if multiple questions map to the same requirements/controls
    const requirementToQuestions = new Map();
    const controlToQuestions = new Map();

    questionToControls.forEach((data, questionId) => {
      const mapping = questionMappings.find(m => m.questionId === questionId);
      if (!mapping || !mapping.controlBasedRequirements) return;

      mapping.controlBasedRequirements.forEach(reqId => {
        if (!requirementToQuestions.has(reqId)) {
          requirementToQuestions.set(reqId, []);
        }
        requirementToQuestions.get(reqId).push(questionId);
      });

      data.controlIds.forEach(controlId => {
        if (!controlToQuestions.has(controlId)) {
          controlToQuestions.set(controlId, []);
        }
        controlToQuestions.get(controlId).push(questionId);
      });
    });

    logSubsection('Requirements Mapped by Multiple Questions');

    const overlappingReqs = Array.from(requirementToQuestions.entries())
      .filter(([reqId, questions]) => questions.length > 1)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    console.log(`\n   Found ${overlappingReqs.length} requirements mapped by multiple questions`);

    overlappingReqs.forEach(([reqId, questionIds]) => {
      const req = requirements.find(r => String(r._id || r.requirementId) === reqId || r.requirementId === reqId);
      console.log(`\n   Requirement: ${req?.requirementId || reqId}`);
      console.log(`   Title: ${req?.title?.substring(0, 60) || 'N/A'}...`);
      console.log(`   Mapped by ${questionIds.length} questions: ${questionIds.join(', ')}`);
    });

    logSubsection('Controls Mapped by Multiple Questions');

    const overlappingControls = Array.from(controlToQuestions.entries())
      .filter(([controlId, questions]) => questions.length > 1)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    console.log(`\n   Found ${overlappingControls.length} controls mapped by multiple questions`);

    overlappingControls.forEach(([controlId, questionIds]) => {
      const control = controls.find(c => String(c._id || c.controlId) === controlId || c.controlId === controlId);
      console.log(`\n   Control: ${control?.controlId || controlId}`);
      console.log(`   Title: ${control?.title?.substring(0, 60) || 'N/A'}...`);
      console.log(`   Mapped by ${questionIds.length} questions: ${questionIds.join(', ')}`);
    });

    // ========================================================================
    // TEST 5: Coherence Analysis
    // ========================================================================
    logSection('TEST 5: Mapping Coherence Analysis');

    const lowCoherenceQuestions = mappingStats
      .filter(s => s.coherence < 50)
      .sort((a, b) => a.coherence - b.coherence)
      .slice(0, 10);

    console.log(`\n   Questions with Low Coherence (<50%):`);
    lowCoherenceQuestions.forEach(stats => {
      console.log(`\n   ${stats.questionId}: ${stats.coherence.toFixed(2)}%`);
      console.log(`      Text: "${stats.questionText}..."`);
      console.log(`      Requirements: ${stats.controlBasedRequirements}`);
      console.log(`      High Confidence: ${stats.highConfidence}/${stats.controlBasedRequirements}`);

      if (stats.coherence < 30) {
        issues.push(`Question ${stats.questionId} has very low coherence (${stats.coherence.toFixed(2)}%)`);
      }
    });

    // ========================================================================
    // SUMMARY
    // ========================================================================
    logSection('ANALYSIS SUMMARY');

    console.log(`\n✅ Analysis Completed`);
    console.log(`❌ Critical Issues: ${issues.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);

    if (issues.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES FOUND:`);
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

    // Hypothesis validation
    console.log(`\n📊 HYPOTHESIS VALIDATION:`);
    
    const tooManyReqs = mappingStats.filter(s => s.controlBasedRequirements > 15).length;
    const tooManyControls = Array.from(questionToControls.values()).filter(d => d.controls > 10).length;
    
    if (tooManyReqs > 0 || tooManyControls > 0) {
      console.log(`   ❌ HYPOTHESIS CONFIRMED: Questions are too broadly mapped!`);
      console.log(`      - ${tooManyReqs} questions map to >15 requirements`);
      console.log(`      - ${tooManyControls} questions map to >10 controls`);
      console.log(`\n   💡 RECOMMENDATION: Review and narrow question-to-requirement mappings`);
    } else {
      console.log(`   ✅ HYPOTHESIS NOT CONFIRMED: Question mappings appear reasonable`);
      console.log(`      - Average requirements per question: ${avgRequirements.toFixed(2)}`);
      console.log(`      - Max requirements: ${maxRequirements}`);
    }

    if (duplicateQuestionIds.length > 0) {
      console.log(`\n   ❌ DUPLICATE QUESTION IDs FOUND: ${duplicateQuestionIds.length}`);
      console.log(`   💡 RECOMMENDATION: Fix duplicate question IDs`);
    }

    if (issues.length === 0 && warnings.length === 0) {
      console.log(`\n🎉 No critical issues found!`);
    } else {
      console.log(`\n⚠️  Issues found. Review recommendations above.`);
    }

  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the analysis
analyzeQuestionRequirementMapping()
  .then(() => {
    console.log('\n✅ Analysis completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Analysis failed:', error);
    process.exit(1);
  });
