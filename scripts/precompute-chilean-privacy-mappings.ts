/**
 * Precompute question mappings for Chilean Privacy Law
 * Uses the same methodology as DORA but for Chilean Privacy regulation
 */

import { precomputeAllMappings } from '../lib/services/precomputed-mappings';
import { RegulationType } from '../lib/regulations';

async function main() {
  console.log('🚀 Precomputing mappings for Chilean Privacy Law...\n');
  
  try {
    // Export existing mappings before recomputing (backup)
    try {
      const { default: exportMappings } = await import('./export-mappings-to-json');
      console.log('📦 Creating backup of existing mappings...\n');
      await exportMappings();
      console.log('');
    } catch (e) {
      console.log('⚠️  Could not backup existing mappings (may not exist yet):', (e as Error).message);
      console.log('');
    }
    
    await precomputeAllMappings(undefined, RegulationType.CHILEAN_PRIVACY);
    console.log('\n✅ Precomputation complete for Chilean Privacy!\n');
    
    // Export newly computed mappings
    try {
      const { default: exportMappings } = await import('./export-mappings-to-json');
      console.log('📤 Exporting newly computed mappings...\n');
      await exportMappings();
    } catch (e) {
      console.log('⚠️  Could not export mappings:', (e as Error).message);
    }
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
