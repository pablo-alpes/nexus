/**
 * Precompute all question mappings with NLP validation
 * Run this when rule versions are updated
 * 
 * Usage: npm run precompute:mappings [--version=2.0]
 */

import { precomputeAllMappings, getCurrentRuleVersion, getOverallCoherenceMetrics } from '../lib/services/precomputed-mappings';
import { connectDBLocal } from '../lib/mongodb-local';

async function main() {
  const args = process.argv.slice(2);
  const versionArg = args.find(arg => arg.startsWith('--version='));
  const ruleVersion = versionArg ? versionArg.split('=')[1] : getCurrentRuleVersion();
  
  console.log('='.repeat(80));
  console.log('🔧 Precomputation Script - Hybrid Approach (Logic + NLP)');
  console.log('='.repeat(80));
  console.log(`\nRule Version: ${ruleVersion}\n`);
  
  try {
    await connectDBLocal();
    
    // Precompute all mappings
    await precomputeAllMappings(ruleVersion);
    
    // Get overall metrics
    const metrics = await getOverallCoherenceMetrics(ruleVersion);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 Overall Coherence Metrics');
    console.log('='.repeat(80));
    console.log(`Rule Version: ${metrics.ruleVersion}`);
    console.log(`Total Questions: ${metrics.totalQuestions}`);
    console.log(`Average Coherence: ${metrics.averageCoherence.toFixed(1)}%`);
    console.log(`Average Relevance: ${(metrics.averageRelevance * 100).toFixed(1)}%`);
    console.log(`\nConfidence Distribution:`);
    console.log(`  High Confidence: ${metrics.highConfidencePercentage.toFixed(1)}%`);
    console.log(`  Medium Confidence: ${metrics.mediumConfidencePercentage.toFixed(1)}%`);
    console.log(`  Low Confidence: ${metrics.lowConfidencePercentage.toFixed(1)}%`);
    console.log('='.repeat(80));
    console.log('\n✅ Precomputation complete!\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error during precomputation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

