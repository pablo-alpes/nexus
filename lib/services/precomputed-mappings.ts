/**
 * Precomputed Mappings Service
 * Manages pre-computed question→requirement mappings with NLP validation
 */

import { connectDBLocal } from '@/lib/mongodb-local';
import Question from '@/models/Question';
import DORARequirement from '@/models/DORARequirement';
import Control from '@/models/Control';
import QuestionMapping from '@/models/QuestionMapping';
import RuleVersion from '@/models/RuleVersion';
import { generateEmbedding, calculateSimilarity, getConfidenceLevel, cosineSimilarity } from './nlp-similarity';
import fs from 'fs';
import path from 'path';

const ISO_CONTROLS_PATH = path.join(process.cwd(), 'data', 'iso27002-controls.json');

export interface PrecomputedMappingResult {
  questionId: string;
  controlBasedRequirements: string[];
  nlpSimilarities: Array<{
    requirementId: string;
    similarity: number;
    isControlBased: boolean;
    confidence: 'high' | 'medium' | 'low';
  }>;
  coherenceMetrics: {
    averageRelevance: number;
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
    overallCoherence: number;
  };
}

/**
 * Get current rule version from iso27002-controls.json
 */
export function getCurrentRuleVersion(): string {
  try {
    if (fs.existsSync(ISO_CONTROLS_PATH)) {
      const isoControls = JSON.parse(fs.readFileSync(ISO_CONTROLS_PATH, 'utf8'));
      return isoControls.metadata?.version || '1.0';
    }
  } catch (error) {
    console.error('Error reading rule version:', error);
  }
  return '1.0';
}

/**
 * Get or create active rule version
 */
export async function getActiveRuleVersion(): Promise<string> {
  await connectDBLocal();
  
  const currentVersion = getCurrentRuleVersion();
  
  // Check if version exists
  let ruleVersion = await RuleVersion.findOne({ version: currentVersion });
  
  if (!ruleVersion) {
    // Create new rule version
    ruleVersion = await RuleVersion.create({
      version: currentVersion,
      isoControlsVersion: currentVersion,
      status: 'PENDING',
      effectiveDate: new Date(),
    });
  }
  
  return currentVersion;
}

/**
 * Get precomputed mappings for a question
 */
export async function getPrecomputedMappings(
  questionId: string,
  ruleVersion?: string
): Promise<PrecomputedMappingResult | null> {
  await connectDBLocal();
  
  const version = ruleVersion || await getActiveRuleVersion();
  
  const mapping = await QuestionMapping.findOne({
    questionId,
    ruleVersion: version,
  });
  
  if (!mapping) {
    return null;
  }
  
  return {
    questionId: mapping.questionId,
    controlBasedRequirements: mapping.controlBasedRequirements,
    nlpSimilarities: mapping.nlpSimilarities,
    coherenceMetrics: mapping.coherenceMetrics,
  };
}

/**
 * Check if mappings need recomputation
 */
export async function needsRecomputation(ruleVersion: string): Promise<boolean> {
  await connectDBLocal();
  
  const mapping = await QuestionMapping.findOne({ ruleVersion });
  const ruleVersionDoc = await RuleVersion.findOne({ version: ruleVersion });
  
  // Need recomputation if:
  // 1. No mappings exist for this version
  // 2. Rule version status is not ACTIVE
  // 3. Mappings are outdated
  return !mapping || 
         !ruleVersionDoc || 
         ruleVersionDoc.status !== 'ACTIVE' ||
         !mapping.computedAt;
}

/**
 * Get requirements from control mappings for a question
 */
async function getRequirementsFromControls(question: any): Promise<string[]> {
  await connectDBLocal();
  
  const controls = await Control.find({ pillar: question.pillar });
  const reqsFromControls = new Set<string>();
  
  // Get requirements from DB controls (normalize to requirementId strings)
  for (const control of controls) {
    if (control.requirementIds && Array.isArray(control.requirementIds)) {
      for (const reqId of control.requirementIds) {
        const req = await DORARequirement.findOne({
          $or: [{ _id: reqId }, { requirementId: String(reqId) }],
        });
        if (req) {
          const reqKey = (req as any).requirementId || String(req._id);
          reqsFromControls.add(reqKey);
        } else {
          // If not found, still include stringified id to avoid losing linkage
          reqsFromControls.add(String(reqId));
        }
      }
    }
  }
  
  // Get requirements from ISO controls JSON
  if (fs.existsSync(ISO_CONTROLS_PATH)) {
    const isoControls = JSON.parse(fs.readFileSync(ISO_CONTROLS_PATH, 'utf8')).controls;
    const pillarISOControls = isoControls.filter((c: any) => c.pillar === question.pillar);
    
    pillarISOControls.forEach((control: any) => {
      if (control.doraRequirements && Array.isArray(control.doraRequirements)) {
        control.doraRequirements.forEach((reqId: string) => {
          reqsFromControls.add(reqId);
        });
      }
    });
  }
  
  return Array.from(reqsFromControls);
}

/**
 * Precompute mappings for a single question
 * @param question - The question to precompute mappings for
 * @param ruleVersion - The rule version
 * @param questionEmbedding - Pre-computed question embedding (optional, will compute if not provided)
 * @param requirementEmbeddings - Map of requirementId -> embedding (optional, will compute if not provided)
 */
export async function precomputeQuestionMapping(
  question: any,
  ruleVersion: string,
  questionEmbedding?: number[],
  requirementEmbeddings?: Map<string, number[]>
): Promise<PrecomputedMappingResult> {
  await connectDBLocal();
  
  console.log(`Precomputing mappings for ${question.questionId}...`);
  
  // Step 1: Get control-based requirements
  const controlBasedReqs = await getRequirementsFromControls(question);
  const controlBasedSet = new Set(controlBasedReqs);
  
  // Step 2: Get all requirements for this pillar
  const allRequirements = await DORARequirement.find({ pillar: question.pillar });
  
  // Step 3: Generate question embedding (use provided or compute)
  const questionText = `${question.pillar || ''} ${question.text}`;
  const qEmbedding = questionEmbedding || await generateEmbedding(questionText);
  
  // Step 4: Generate embeddings for all requirements and calculate similarities
  const nlpSimilarities = [];
  let totalSimilarity = 0;
  let controlBasedSimilaritySum = 0;
  let controlBasedCount = 0;
  
  for (const req of allRequirements) {
    const reqText = `${req.pillar || ''} ${req.title || ''} ${req.description || ''}`;
    // Use cached embedding if available, otherwise compute
    const reqEmbedding = requirementEmbeddings?.get(req.requirementId) || await generateEmbedding(reqText);
    
    // Cache the embedding if we computed it
    if (requirementEmbeddings && !requirementEmbeddings.has(req.requirementId)) {
      requirementEmbeddings.set(req.requirementId, reqEmbedding);
    }
    
    // Calculate cosine similarity
    const similarity = cosineSimilarity(qEmbedding, reqEmbedding);
    const isControlBased = controlBasedSet.has(req.requirementId);
    const confidence = getConfidenceLevel(similarity);
    
    nlpSimilarities.push({
      requirementId: req.requirementId,
      similarity,
      isControlBased,
      confidence,
    });
    
    totalSimilarity += similarity;
    
    if (isControlBased) {
      controlBasedSimilaritySum += similarity;
      controlBasedCount++;
    }
  }
  
  // Step 5: Calculate coherence metrics
  const averageRelevance = controlBasedCount > 0 
    ? controlBasedSimilaritySum / controlBasedCount 
    : 0;
  
  const highConfidenceCount = nlpSimilarities.filter(
    s => s.isControlBased && s.confidence === 'high'
  ).length;
  
  const mediumConfidenceCount = nlpSimilarities.filter(
    s => s.isControlBased && s.confidence === 'medium'
  ).length;
  
  const lowConfidenceCount = nlpSimilarities.filter(
    s => s.isControlBased && s.confidence === 'low'
  ).length;
  
  const overallCoherence = controlBasedCount > 0
    ? (highConfidenceCount / controlBasedCount) * 100
    : 0;
  
  const coherenceMetrics = {
    averageRelevance,
    highConfidenceCount,
    mediumConfidenceCount,
    lowConfidenceCount,
    overallCoherence,
  };
  
  // Step 6: Save to database
  await QuestionMapping.findOneAndUpdate(
    { questionId: question.questionId, ruleVersion },
    {
      questionId: question.questionId,
      ruleVersion,
      controlBasedRequirements: controlBasedReqs,
      nlpSimilarities,
      coherenceMetrics,
      computedAt: new Date(),
      version: ruleVersion,
    },
    { upsert: true, new: true }
  );
  
  return {
    questionId: question.questionId,
    controlBasedRequirements: controlBasedReqs,
    nlpSimilarities,
    coherenceMetrics,
  };
}

/**
 * Precompute all question mappings for a rule version
 */
export async function precomputeAllMappings(ruleVersion?: string): Promise<void> {
  await connectDBLocal();
  
  const version = ruleVersion || getCurrentRuleVersion();
  
  console.log(`\n🚀 Starting precomputation for rule version ${version}...\n`);
  
  // Update rule version status
  await RuleVersion.findOneAndUpdate(
    { version },
    { status: 'PRE_COMPUTING', precomputedAt: new Date() },
    { upsert: true, new: true }
  );
  
  // Get all questions (deduplicated)
  const allQuestions = await Question.find();
  const seenQuestionIds = new Set();
  const uniqueQuestions = allQuestions.filter(q => {
    if (seenQuestionIds.has(q.questionId)) return false;
    seenQuestionIds.add(q.questionId);
    return true;
  });
  
  console.log(`Found ${uniqueQuestions.length} unique questions\n`);
  
  // Pre-load NLP model once (this will download it if needed)
  console.log('📥 Pre-loading NLP model (this may take a few minutes on first run)...');
  try {
    const { getNLPModel } = await import('./nlp-similarity');
    await getNLPModel();
    console.log('✅ NLP model loaded successfully\n');
  } catch (error: any) {
    console.error('❌ Failed to load NLP model:', error.message);
    throw error;
  }
  
  // Cache for requirement embeddings (shared across questions)
  const requirementEmbeddings = new Map<string, number[]>();
  
  // Get all unique requirements across all pillars
  const allRequirements = await DORARequirement.find();
  console.log(`📊 Pre-computing embeddings for ${allRequirements.length} requirements...`);
  const { generateEmbedding } = await import('./nlp-similarity');
  
  for (const req of allRequirements) {
    try {
      const reqText = `${req.description || ''} ${req.title || ''}`;
      const embedding = await generateEmbedding(reqText);
      requirementEmbeddings.set(req.requirementId, embedding);
    } catch (error: any) {
      console.warn(`⚠️  Failed to generate embedding for ${req.requirementId}:`, error.message);
    }
  }
  console.log(`✅ Cached ${requirementEmbeddings.size} requirement embeddings\n`);
  
  let processed = 0;
  for (const question of uniqueQuestions) {
    try {
      // Pre-compute question embedding once
      const questionText = `${question.text}`;
      const questionEmbedding = await generateEmbedding(questionText);
      
      await precomputeQuestionMapping(question, version, questionEmbedding, requirementEmbeddings);
      processed++;
      console.log(`✅ [${processed}/${uniqueQuestions.length}] ${question.questionId}`);
    } catch (error: any) {
      console.error(`❌ Error processing ${question.questionId}:`, error.message);
    }
  }
  
  // Update rule version status to ACTIVE
  await RuleVersion.findOneAndUpdate(
    { version },
    { status: 'ACTIVE', precomputedAt: new Date() }
  );
  
  console.log(`\n✅ Precomputation complete for version ${version}`);
  console.log(`   Processed ${processed}/${uniqueQuestions.length} questions\n`);
}

/**
 * Get overall coherence metrics for a rule version
 */
export async function getOverallCoherenceMetrics(ruleVersion?: string): Promise<{
  ruleVersion: string;
  totalQuestions: number;
  averageCoherence: number;
  averageRelevance: number;
  highConfidencePercentage: number;
  mediumConfidencePercentage: number;
  lowConfidencePercentage: number;
}> {
  await connectDBLocal();
  
  const version = ruleVersion || await getActiveRuleVersion();
  
  const mappings = await QuestionMapping.find({ ruleVersion: version });
  
  if (mappings.length === 0) {
    return {
      ruleVersion: version,
      totalQuestions: 0,
      averageCoherence: 0,
      averageRelevance: 0,
      highConfidencePercentage: 0,
      mediumConfidencePercentage: 0,
      lowConfidencePercentage: 0,
    };
  }
  
  const totalCoherence = mappings.reduce((sum, m) => sum + (m.coherenceMetrics.overallCoherence || 0), 0);
  const totalRelevance = mappings.reduce((sum, m) => sum + (m.coherenceMetrics.averageRelevance || 0), 0);
  const totalHigh = mappings.reduce((sum, m) => sum + (m.coherenceMetrics.highConfidenceCount || 0), 0);
  const totalMedium = mappings.reduce((sum, m) => sum + (m.coherenceMetrics.mediumConfidenceCount || 0), 0);
  const totalLow = mappings.reduce((sum, m) => sum + (m.coherenceMetrics.lowConfidenceCount || 0), 0);
  const totalControlBased = mappings.reduce((sum, m) => sum + (m.controlBasedRequirements.length || 0), 0);
  
  return {
    ruleVersion: version,
    totalQuestions: mappings.length,
    averageCoherence: totalCoherence / mappings.length,
    averageRelevance: totalRelevance / mappings.length,
    highConfidencePercentage: totalControlBased > 0 ? (totalHigh / totalControlBased) * 100 : 0,
    mediumConfidencePercentage: totalControlBased > 0 ? (totalMedium / totalControlBased) * 100 : 0,
    lowConfidencePercentage: totalControlBased > 0 ? (totalLow / totalControlBased) * 100 : 0,
  };
}


