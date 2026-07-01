/**
 * Test script to verify requirements are loaded correctly
 */

const { connectDBLocal } = require('./lib/mongodb-local.js');
const { RequirementOperations } = require('./lib/model-operations.ts');

async function test() {
  try {
    await connectDBLocal();
    
    console.log('\n📋 Testing RequirementOperations.findByRegulation...');
    const reqs = await RequirementOperations.findByRegulation('CHILEAN_PRIVACY');
    console.log(`✅ Found ${reqs.length} Chilean Privacy requirements`);
    
    if (reqs.length > 0) {
      console.log('\nSample requirement IDs:');
      reqs.slice(0, 5).forEach(r => {
        console.log(`  - ${r.requirementId} (pillar: ${r.pillar || 'N/A'})`);
      });
    } else {
      console.log('\n⚠️  No requirements found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test();
