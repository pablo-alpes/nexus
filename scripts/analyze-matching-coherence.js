/**
 * Analyze coherence and relevance of matches
 * - Are keyword matches actually relevant?
 * - Do the matched requirements make sense for the question?
 * - Quality analysis, not just quantity
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
  // Remove common words and extract meaningful terms
  const stopWords = new Set(['do', 'you', 'have', 'for', 'and', 'the', 'with', 'are', 'your', 'an', 'a', 'to', 'of', 'in', 'on', 'at', 'by', 'is', 'as']);
  return text.toLowerCase()
    .split(/[\s,\.\?\!]+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}

function calculateRelevance(questionText, requirementText) {
  const questionKeywords = extractKeywords(questionText);
  const reqText = requirementText.toLowerCase();
  
  // Count how many question keywords appear in requirement
  const matches = questionKeywords.filter(kw => reqText.includes(kw));
  const relevanceScore = matches.length / questionKeywords.length;
  
  return {
    score: relevanceScore,
    matchedKeywords: matches,
    totalKeywords: questionKeywords.length
  };
}

function analyzeCoherence() {
  console.log('🔍 Analyzing Matching Coherence & Relevance\n');
  console.log('='.repeat(80));
  console.log('');

  // Load data
  console.log('📊 Loading data...');
  let questions = readCollection('Question');
  const requirements = readCollection('DORARequirement');
  const controls = readCollection('Control');
  const isoControls = JSON.parse(fs.readFileSync(ISO_CONTROLS_PATH, 'utf8')).controls;

  // Deduplicate questions
  const seenQuestionIds = new Set();
  const uniqueQuestions = [];
  questions.forEach(q => {
    if (!seenQuestionIds.has(q.questionId)) {
      seenQuestionIds.add(q.questionId);
      uniqueQuestions.push(q);
    }
  });
  questions = uniqueQuestions;

  console.log(`   Questions: ${questions.length}`);
  console.log(`   Requirements: ${requirements.length}`);
  console.log(`   Controls: ${controls.length}`);
  console.log('');

  // Build requirement → control mapping
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

  // Build control → requirement mapping from DB
  const controlToReqMap = new Map();
  controls.forEach((control) => {
    if (control.requirementIds && Array.isArray(control.requirementIds)) {
      control.requirementIds.forEach((reqId) => {
        const req = requirements.find(r => String(r._id || r.requirementId) === String(reqId));
        if (req) {
          if (!controlToReqMap.has(control.controlId)) {
            controlToReqMap.set(control.controlId, new Set());
          }
          controlToReqMap.get(control.controlId).add(req.requirementId);
        }
      });
    }
  });

  const coherenceResults = [];
  let totalKeywordMatches = 0;
  let totalRelevantMatches = 0;
  let totalIrrelevantMatches = 0;
  let totalExplicitMatches = 0;
  let totalExplicitRelevant = 0;

  console.log('🔬 Analyzing coherence for each question...\n');

  for (const question of questions) {
    const result = {
      questionId: question.questionId,
      questionText: question.text,
      pillar: question.pillar,
      keywordMatching: {
        matches: [],
        relevant: [],
        irrelevant: [],
        averageRelevance: 0,
        coherenceScore: 0
      },
      explicitMatching: {
        matches: [],
        relevant: [],
        irrelevant: [],
        averageRelevance: 0,
        coherenceScore: 0
      },
      controlBasedMatching: {
        matches: [],
        relevant: [],
        irrelevant: [],
        averageRelevance: 0,
        coherenceScore: 0
      }
    };

    // KEYWORD MATCHING ANALYSIS
    const pillarRequirements = requirements.filter(r => r.pillar === question.pillar);
    const keywordMatchedReqs = pillarRequirements.filter((req) => {
      const reqText = `${req.description || ''} ${req.title || ''}`;
      const questionKeywords = extractKeywords(question.text);
      return questionKeywords.some(keyword => reqText.includes(keyword));
    });

    keywordMatchedReqs.forEach((req) => {
      const reqText = `${req.description || ''} ${req.title || ''}`;
      const relevance = calculateRelevance(question.text, reqText);
      
      result.keywordMatching.matches.push({
        requirementId: req.requirementId,
        title: req.title,
        relevanceScore: relevance.score,
        matchedKeywords: relevance.matchedKeywords
      });

      totalKeywordMatches++;
      
      // Consider relevant if score > 0.3 (at least 30% of keywords match)
      if (relevance.score > 0.3) {
        result.keywordMatching.relevant.push(req.requirementId);
        totalRelevantMatches++;
      } else {
        result.keywordMatching.irrelevant.push(req.requirementId);
        totalIrrelevantMatches++;
      }
    });

    if (result.keywordMatching.matches.length > 0) {
      result.keywordMatching.averageRelevance = 
        result.keywordMatching.matches.reduce((sum, m) => sum + m.relevanceScore, 0) / 
        result.keywordMatching.matches.length;
      result.keywordMatching.coherenceScore = 
        result.keywordMatching.relevant.length / result.keywordMatching.matches.length;
    }

    // EXPLICIT MAPPING ANALYSIS (from question options)
    const yesOption = question.options?.find(o => o.value === 'yes');
    const noOption = question.options?.find(o => o.value === 'no');
    
    let explicitReqIds = [];
    if (yesOption?.applicableControls) {
      explicitReqIds = [...explicitReqIds, ...yesOption.applicableControls.map(id => String(id))];
    }
    if (noOption?.applicableControls) {
      explicitReqIds = [...explicitReqIds, ...noOption.applicableControls.map(id => String(id))];
    }

    const explicitReqs = explicitReqIds
      .map((id) => {
        const req = requirements.find(r => String(r._id || r.requirementId) === id || r.requirementId === id);
        return req;
      })
      .filter(Boolean);

    explicitReqs.forEach((req) => {
      const reqText = `${req.description || ''} ${req.title || ''}`;
      const relevance = calculateRelevance(question.text, reqText);
      
      result.explicitMatching.matches.push({
        requirementId: req.requirementId,
        title: req.title,
        relevanceScore: relevance.score,
        matchedKeywords: relevance.matchedKeywords
      });

      totalExplicitMatches++;
      
      if (relevance.score > 0.3) {
        result.explicitMatching.relevant.push(req.requirementId);
        totalExplicitRelevant++;
      } else {
        result.explicitMatching.irrelevant.push(req.requirementId);
      }
    });

    if (result.explicitMatching.matches.length > 0) {
      result.explicitMatching.averageRelevance = 
        result.explicitMatching.matches.reduce((sum, m) => sum + m.relevanceScore, 0) / 
        result.explicitMatching.matches.length;
      result.explicitMatching.coherenceScore = 
        result.explicitMatching.relevant.length / result.explicitMatching.matches.length;
    }

    // CONTROL-BASED MATCHING (what should be matched)
    const pillarControls = controls.filter(c => c.pillar === question.pillar);
    const reqsFromControls = new Set();
    
    pillarControls.forEach((control) => {
      if (control.requirementIds && Array.isArray(control.requirementIds)) {
        control.requirementIds.forEach((reqId) => {
          const req = requirements.find(r => String(r._id || r.requirementId) === String(reqId));
          if (req) {
            reqsFromControls.add(req.requirementId);
          }
        });
      }
    });

    const pillarISOControls = isoControls.filter(c => c.pillar === question.pillar);
    pillarISOControls.forEach((control) => {
      if (control.doraRequirements && Array.isArray(control.doraRequirements)) {
        control.doraRequirements.forEach((reqId) => {
          reqsFromControls.add(reqId);
        });
      }
    });

    Array.from(reqsFromControls).forEach((reqId) => {
      const req = requirements.find(r => r.requirementId === reqId);
      if (req) {
        const reqText = `${req.description || ''} ${req.title || ''}`;
        const relevance = calculateRelevance(question.text, reqText);
        
        result.controlBasedMatching.matches.push({
          requirementId: req.requirementId,
          title: req.title,
          relevanceScore: relevance.score,
          matchedKeywords: relevance.matchedKeywords
        });

        if (relevance.score > 0.3) {
          result.controlBasedMatching.relevant.push(req.requirementId);
        } else {
          result.controlBasedMatching.irrelevant.push(req.requirementId);
        }
      }
    });

    if (result.controlBasedMatching.matches.length > 0) {
      result.controlBasedMatching.averageRelevance = 
        result.controlBasedMatching.matches.reduce((sum, m) => sum + m.relevanceScore, 0) / 
        result.controlBasedMatching.matches.length;
      result.controlBasedMatching.coherenceScore = 
        result.controlBasedMatching.relevant.length / result.controlBasedMatching.matches.length;
    }

    coherenceResults.push(result);
  }

  // Print comprehensive report
  console.log('\n' + '='.repeat(80));
  console.log('📊 COHERENCE & RELEVANCE ANALYSIS REPORT');
  console.log('='.repeat(80));
  console.log('');

  // Overall Statistics
  console.log('📈 OVERALL COHERENCE STATISTICS');
  console.log('─'.repeat(80));
  
  const avgKeywordRelevance = coherenceResults
    .filter(r => r.keywordMatching.matches.length > 0)
    .reduce((sum, r) => sum + r.keywordMatching.averageRelevance, 0) / 
    coherenceResults.filter(r => r.keywordMatching.matches.length > 0).length || 0;
  
  const avgKeywordCoherence = coherenceResults
    .filter(r => r.keywordMatching.matches.length > 0)
    .reduce((sum, r) => sum + r.keywordMatching.coherenceScore, 0) / 
    coherenceResults.filter(r => r.keywordMatching.matches.length > 0).length || 0;

  const avgExplicitRelevance = coherenceResults
    .filter(r => r.explicitMatching.matches.length > 0)
    .reduce((sum, r) => sum + r.explicitMatching.averageRelevance, 0) / 
    coherenceResults.filter(r => r.explicitMatching.matches.length > 0).length || 0;

  const avgExplicitCoherence = coherenceResults
    .filter(r => r.explicitMatching.matches.length > 0)
    .reduce((sum, r) => sum + r.explicitMatching.coherenceScore, 0) / 
    coherenceResults.filter(r => r.explicitMatching.matches.length > 0).length || 0;

  const avgControlRelevance = coherenceResults
    .filter(r => r.controlBasedMatching.matches.length > 0)
    .reduce((sum, r) => sum + r.controlBasedMatching.averageRelevance, 0) / 
    coherenceResults.filter(r => r.controlBasedMatching.matches.length > 0).length || 0;

  const avgControlCoherence = coherenceResults
    .filter(r => r.controlBasedMatching.matches.length > 0)
    .reduce((sum, r) => sum + r.controlBasedMatching.coherenceScore, 0) / 
    coherenceResults.filter(r => r.controlBasedMatching.matches.length > 0).length || 0;

  console.log('KEYWORD MATCHING:');
  console.log(`  Total matches: ${totalKeywordMatches}`);
  console.log(`  Relevant matches: ${totalRelevantMatches} (${((totalRelevantMatches / totalKeywordMatches) * 100).toFixed(1)}%)`);
  console.log(`  Irrelevant matches: ${totalIrrelevantMatches} (${((totalIrrelevantMatches / totalKeywordMatches) * 100).toFixed(1)}%)`);
  console.log(`  Average relevance score: ${(avgKeywordRelevance * 100).toFixed(1)}%`);
  console.log(`  Coherence score: ${(avgKeywordCoherence * 100).toFixed(1)}%`);
  console.log('');

  console.log('EXPLICIT MAPPING:');
  console.log(`  Total matches: ${totalExplicitMatches}`);
  if (totalExplicitMatches > 0) {
    console.log(`  Relevant matches: ${totalExplicitRelevant} (${((totalExplicitRelevant / totalExplicitMatches) * 100).toFixed(1)}%)`);
    console.log(`  Average relevance score: ${(avgExplicitRelevance * 100).toFixed(1)}%`);
    console.log(`  Coherence score: ${(avgExplicitCoherence * 100).toFixed(1)}%`);
  } else {
    console.log(`  ⚠️  No explicit mappings found`);
  }
  console.log('');

  console.log('CONTROL-BASED (IDEAL):');
  console.log(`  Total matches: ${coherenceResults.reduce((sum, r) => sum + r.controlBasedMatching.matches.length, 0)}`);
  console.log(`  Average relevance score: ${(avgControlRelevance * 100).toFixed(1)}%`);
  console.log(`  Coherence score: ${(avgControlCoherence * 100).toFixed(1)}%`);
  console.log('');

  // Quality Issues
  console.log('⚠️  QUALITY ISSUES');
  console.log('─'.repeat(80));
  
  const lowCoherenceQuestions = coherenceResults.filter(
    r => r.keywordMatching.matches.length > 0 && r.keywordMatching.coherenceScore < 0.5
  );
  
  console.log(`Questions with low coherence (<50%): ${lowCoherenceQuestions.length}`);
  console.log(`Questions with high coherence (>80%): ${coherenceResults.filter(r => r.keywordMatching.coherenceScore > 0.8).length}`);
  console.log('');

  // Top 5 worst coherence
  console.log('🔴 TOP 5 WORST COHERENCE (Keyword Matching)');
  console.log('─'.repeat(80));
  const worstCoherence = coherenceResults
    .filter(r => r.keywordMatching.matches.length > 0)
    .sort((a, b) => a.keywordMatching.coherenceScore - b.keywordMatching.coherenceScore)
    .slice(0, 5);

  worstCoherence.forEach((result, idx) => {
    console.log(`\n${idx + 1}. ${result.questionId}: ${result.questionText.substring(0, 60)}...`);
    console.log(`   Coherence: ${(result.keywordMatching.coherenceScore * 100).toFixed(1)}%`);
    console.log(`   Relevance: ${(result.keywordMatching.averageRelevance * 100).toFixed(1)}%`);
    console.log(`   Matches: ${result.keywordMatching.matches.length} (${result.keywordMatching.relevant.length} relevant, ${result.keywordMatching.irrelevant.length} irrelevant)`);
    if (result.keywordMatching.irrelevant.length > 0) {
      console.log(`   Irrelevant examples:`);
      result.keywordMatching.irrelevant.slice(0, 3).forEach(reqId => {
        const req = requirements.find(r => r.requirementId === reqId);
        if (req) {
          console.log(`     - ${reqId}: ${req.title.substring(0, 50)}...`);
        }
      });
    }
  });

  // Save detailed results
  const outputPath = path.join(__dirname, '../data/coherence-analysis-results.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({
      metadata: {
        generatedAt: new Date().toISOString(),
        totalQuestions: questions.length,
      },
      statistics: {
        totalKeywordMatches,
        totalRelevantMatches,
        totalIrrelevantMatches,
        totalExplicitMatches,
        totalExplicitRelevant,
        avgKeywordRelevance,
        avgKeywordCoherence,
        avgExplicitRelevance,
        avgExplicitCoherence,
        avgControlRelevance,
        avgControlCoherence,
      },
      results: coherenceResults,
    }, null, 2)
  );

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Detailed results saved to: ${outputPath}`);
  console.log('='.repeat(80));
}

try {
  analyzeCoherence();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}

