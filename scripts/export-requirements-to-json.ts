/**
 * Export Requirements from Database to JSON
 * Preserves existing parsed requirements by exporting them back to JSON file
 */

import { connectDBLocal } from '../lib/mongodb-local';
import { RequirementOperations } from '../lib/model-operations';
import { RegulationType } from '../lib/regulations';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_FILE = path.join(__dirname, '../data/chilean-privacy-requirements.json');

async function exportRequirements() {
  try {
    await connectDBLocal();
    
    console.log('📤 Exporting requirements from database to JSON...\n');
    
    // Get all requirements from database
    const requirements = await RequirementOperations.findByRegulation(RegulationType.CHILEAN_PRIVACY);
    
    console.log(`📋 Found ${requirements.length} requirements in database\n`);
    
    if (requirements.length === 0) {
      console.log('⚠️  No requirements found in database. Nothing to export.\n');
      return;
    }
    
    // Transform to JSON format
    const structured = requirements.map((req: any) => ({
      requirementId: req.requirementId,
      article: req.article || null,
      paragraph: req.paragraph || null,
      literal: req.literal || null,
      nestedNumber: req.nestedNumber || null,
      level: req.level || 0,
      parentRequirementId: req.parentRequirementId || null,
      title: req.title || req.requirementId,
      description: req.description || req.legalText || '',
      legalText: req.legalText || req.fullLegalText || '',
      fullLegalText: req.fullLegalText || req.legalText || '',
      pillar: req.pillar || 'SECURITY',
      pillarConfidence: req.pillarConfidence || 'low',
      complianceStatus: req.complianceStatus || 'NOT_APPLICABLE',
      applicableTo: req.applicableTo || [],
      iso27001Mappings: req.iso27001Mappings || [],
      iso27701Mappings: req.iso27701Mappings || [],
    }));
    
    // Group by pillar for metadata
    const pillars = Array.from(new Set(structured.map((r: any) => r.pillar)));
    
    // Create output structure
    const output = {
      metadata: {
        regulation: 'CHILEAN_PRIVACY',
        lawName: 'Ley 21.719 - Protección de Datos Personales',
        source: 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
        parsedAt: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        totalRequirements: structured.length,
        pillars: pillars,
      },
      requirements: structured,
    };
    
    // Ensure directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    
    console.log(`✅ Exported ${structured.length} requirements to: ${OUTPUT_FILE}\n`);
    console.log('📊 Summary:');
    console.log(`   Total requirements: ${structured.length}`);
    const pillarCounts = structured.reduce((acc: any, r: any) => {
      acc[r.pillar] = (acc[r.pillar] || 0) + 1;
      return acc;
    }, {});
    console.log('   Requirements by pillar:');
    Object.entries(pillarCounts).forEach(([pillar, count]) => {
      console.log(`     ${pillar}: ${count}`);
    });
    console.log('\n✅ Export complete!\n');
    
    // Also export mappings if they exist
    try {
      const { default: exportMappings } = await import('./export-mappings-to-json');
      console.log('📤 Also exporting mappings...\n');
      await exportMappings();
    } catch (e) {
      console.log('⚠️  Could not export mappings:', (e as Error).message);
    }
    
  } catch (error: any) {
    console.error('❌ Error exporting requirements:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  exportRequirements();
}

export default exportRequirements;
