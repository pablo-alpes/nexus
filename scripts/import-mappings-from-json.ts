/**
 * Import Question Mappings from JSON to Database
 * Restores precomputed mappings from backup file
 */

import { connectDBLocal, isLocalStorage } from '../lib/mongodb-local';
import QuestionMapping from '../models/QuestionMapping';
import * as fs from 'fs';
import * as path from 'path';

const MAPPINGS_FILE = path.join(__dirname, '../data/chilean-privacy-mappings-backup.json');

async function importMappings() {
  try {
    await connectDBLocal();
    
    console.log('📥 Importing question mappings from JSON to database...\n');
    
    // Check if file exists
    if (!fs.existsSync(MAPPINGS_FILE)) {
      console.error(`❌ Mappings file not found: ${MAPPINGS_FILE}`);
      console.error('   Please run export:mappings first to create a backup.\n');
      process.exit(1);
    }
    
    // Read mappings file
    const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
    const mappings = data.mappings || [];
    
    console.log(`📋 Found ${mappings.length} mappings to import\n`);
    
    if (mappings.length === 0) {
      console.log('⚠️  No mappings found in file.\n');
      return;
    }
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    for (const mapping of mappings) {
      try {
        const mappingData = {
          questionId: mapping.questionId,
          ruleVersion: mapping.ruleVersion || mapping.version || '2.0',
          controlBasedRequirements: mapping.controlBasedRequirements || [],
          nlpSimilarities: mapping.nlpSimilarities || [],
          coherenceMetrics: mapping.coherenceMetrics || {
            averageRelevance: 0,
            highConfidenceCount: 0,
            mediumConfidenceCount: 0,
            lowConfidenceCount: 0,
            overallCoherence: 0,
          },
          computedAt: mapping.computedAt ? new Date(mapping.computedAt) : new Date(),
          version: mapping.ruleVersion || mapping.version || '2.0',
        };
        
        // Check if mapping exists
        let existing: any = null;
        if (isLocalStorage()) {
          const QuestionMappingModel = QuestionMapping as any;
          const allMappings = await QuestionMappingModel.find({});
          existing = allMappings.find((m: any) => 
            m.questionId === mappingData.questionId && 
            (m.ruleVersion === mappingData.ruleVersion || m.version === mappingData.version)
          );
        } else {
          existing = await QuestionMapping.findOne({
            questionId: mappingData.questionId,
            ruleVersion: mappingData.ruleVersion,
          });
        }
        
        // Upsert mapping
        if (isLocalStorage()) {
          const QuestionMappingModel = QuestionMapping as any;
          if (existing) {
            await QuestionMappingModel.findOneAndUpdate(
              { questionId: mappingData.questionId, ruleVersion: mappingData.ruleVersion },
              mappingData,
              { upsert: true, new: true }
            );
            updated++;
          } else {
            await QuestionMappingModel.create(mappingData);
            imported++;
          }
        } else {
          await QuestionMapping.findOneAndUpdate(
            { questionId: mappingData.questionId, ruleVersion: mappingData.ruleVersion },
            mappingData,
            { upsert: true, new: true }
          );
          if (existing) {
            updated++;
          } else {
            imported++;
          }
        }
      } catch (error: any) {
        console.error(`❌ Error importing mapping ${mapping.questionId}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total: ${mappings.length}\n`);
    
    console.log('✅ Import complete!\n');
    
  } catch (error: any) {
    console.error('❌ Error importing mappings:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  importMappings();
}

export default importMappings;
