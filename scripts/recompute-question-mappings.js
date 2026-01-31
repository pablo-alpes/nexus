/**
 * Recompute Question Mappings with Improved Logic
 * 
 * This script re-runs the precomputation with the improved filtering logic:
 * - Only includes requirements with similarity >= 0.5 (medium/high confidence)
 * - Limits to top 20 requirements per question
 * - Prioritizes control-based requirements
 * 
 * Usage: node scripts/recompute-question-mappings.js
 */

// This is a TypeScript file, so we need to use ts-node or compile it
// For now, let's create instructions

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Recompute Question Mappings with Improved Logic              ║
╚════════════════════════════════════════════════════════════════╝

This script will re-run precomputation with improved filtering:
  ✅ Only includes requirements with similarity >= 0.5
  ✅ Limits to top 20 requirements per question
  ✅ Prioritizes control-based requirements
  ✅ Improves coherence by filtering low-confidence matches

To run this, you have two options:

Option 1: Use the API endpoint (if available)
  POST /api/admin/precompute-mappings

Option 2: Run directly with Node.js
  cd nexus
  npx ts-node -e "
    import('./lib/services/precomputed-mappings.js').then(async (module) => {
      await module.precomputeAllMappings();
      console.log('✅ Precomputation complete!');
      process.exit(0);
    }).catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
  "

Option 3: Create a simple TypeScript file and run it
  See instructions below...

After recomputation, run the test script to verify improvements:
  node scripts/test-question-requirement-mapping.js
`);

// For direct execution, we'll provide a simple way
if (require.main === module) {
  console.log('\n⚠️  This script needs to be run with TypeScript support.');
  console.log('Please use one of the options above, or create a TypeScript file.\n');
  
  // Provide a simple Node.js alternative that uses the compiled code
  console.log('Alternatively, you can run this after building:');
  console.log('  npm run build');
  console.log('  node dist/scripts/recompute-question-mappings.js\n');
}
