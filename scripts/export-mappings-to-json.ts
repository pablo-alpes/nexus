/**
 * Export Question Mappings from Database to JSON
 * Preserves all precomputed question-to-requirement mappings
 */

import { connectDBLocal, isLocalStorage } from '../lib/mongodb-local';
import QuestionMapping from '../models/QuestionMapping';
import { RegulationType } from '../lib/regulations';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'chilean-privacy-mappings-backup.json');

async function exportMappings() {
  try {
    await connectDBLocal();
    
    console.log('📤 Exporting question mappings from database to JSON...\n');
    
    // Get all mappings for Chilean Privacy
    // Note: QuestionMapping might not have regulationType field, so we'll get all and filter by questionId prefix
    let allMappings: any[] = [];
    if (isLocalStorage()) {
      const QuestionMappingModel = QuestionMapping as any;
      allMappings = await QuestionMappingModel.find({});
    } else {
      allMappings = await QuestionMapping.find({});
    }
    
    // Filter for Chilean Privacy (questions start with Q-PRIV- or similar)
    const chileanMappings = allMappings.filter((m: any) => {
      const qId = m.questionId || '';
      return qId.includes('PRIV') || qId.includes('CHILE') || qId.startsWith('Q-PRIV-');
    });
    
    console.log(`📋 Found ${allMappings.length} total mappings`);
    console.log(`📋 Found ${chileanMappings.length} Chilean Privacy mappings\n`);
    
    if (chileanMappings.length === 0) {
      console.log('⚠️  No Chilean Privacy mappings found in database.\n');
      console.log('💡 To generate mappings, run:');
      console.log('   npm run precompute:mappings:privacy\n');
      return;
    }
    
    // Transform to JSON format
    const structured = chileanMappings.map((mapping: any) => ({
      questionId: mapping.questionId,
      ruleVersion: mapping.ruleVersion || mapping.version || '1.0.0',
      controlBasedRequirements: mapping.controlBasedRequirements || [],
      nlpSimilarities: mapping.nlpSimilarities || [],
      coherenceMetrics: mapping.coherenceMetrics || {
        averageRelevance: 0,
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        overallCoherence: 0,
      },
      computedAt: mapping.computedAt || mapping.createdAt || new Date().toISOString(),
    }));
    
    // Group by rule version
    const versions = Array.from(new Set(structured.map((m: any) => m.ruleVersion)));
    
    // Create output structure
    const output = {
      metadata: {
        regulation: 'CHILEAN_PRIVACY',
        exportedAt: new Date().toISOString(),
        totalMappings: structured.length,
        ruleVersions: versions,
        questionIds: Array.from(new Set(structured.map((m: any) => m.questionId))),
      },
      mappings: structured,
    };
    
    // Ensure directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(OUTPUT_DIR, `chilean-privacy-mappings-backup-${timestamp}.json`);
    
    // Write main file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    
    // Write timestamped backup
    fs.writeFileSync(backupFile, JSON.stringify(output, null, 2));
    
    console.log(`✅ Exported ${structured.length} mappings to: ${OUTPUT_FILE}`);
    console.log(`✅ Backup created: ${backupFile}\n`);
    
    // Print summary
    console.log('📊 Summary:');
    console.log(`   Total mappings: ${structured.length}`);
    console.log(`   Rule versions: ${versions.join(', ')}`);
    console.log(`   Unique questions: ${output.metadata.questionIds.length}`);
    
    // Count by confidence level
    const confidenceCounts = {
      high: 0,
      medium: 0,
      low: 0,
    };
    
    structured.forEach((m: any) => {
      m.nlpSimilarities.forEach((sim: any) => {
        if (sim.confidence === 'high') confidenceCounts.high++;
        else if (sim.confidence === 'medium') confidenceCounts.medium++;
        else if (sim.confidence === 'low') confidenceCounts.low++;
      });
    });
    
    console.log(`   High confidence similarities: ${confidenceCounts.high}`);
    console.log(`   Medium confidence similarities: ${confidenceCounts.medium}`);
    console.log(`   Low confidence similarities: ${confidenceCounts.low}`);
    console.log(`   Control-based requirements: ${structured.reduce((sum: number, m: any) => sum + (m.controlBasedRequirements?.length || 0), 0)}`);
    console.log('\n✅ Export complete!\n');
    
  } catch (error: any) {
    console.error('❌ Error exporting mappings:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  exportMappings();
}

export default exportMappings;
