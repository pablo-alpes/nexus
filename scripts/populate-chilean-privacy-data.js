/**
 * Populate Chilean Privacy Data
 * 
 * This script:
 * 1. Imports Chilean Privacy requirements
 * 2. Creates Chilean Privacy questionnaire
 * 3. Creates controls from ISO 27701
 * 4. Precomputes mappings
 * 
 * Usage: node scripts/populate-chilean-privacy-data.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Populating Chilean Privacy Data...\n');

const scripts = [
  {
    name: 'Fetch Chilean Privacy Law',
    script: 'node scripts/fetch-chilean-privacy-law.js',
    required: false, // May fail if website is slow
  },
  {
    name: 'Import Chilean Privacy Requirements',
    script: 'npx tsx scripts/import-chilean-privacy-requirements.js',
    required: true,
  },
  {
    name: 'Create Chilean Privacy Questionnaire',
    script: 'npx tsx scripts/create-chilean-privacy-questionnaire.js',
    required: true,
  },
  {
    name: 'Create Chilean Privacy Controls',
    script: 'npx tsx scripts/create-chilean-privacy-controls.js',
    required: true,
  },
  {
    name: 'Precompute Chilean Privacy Mappings',
    script: 'npm run precompute:mappings:privacy',
    required: true,
  },
];

let successCount = 0;
let failCount = 0;
const errors = [];

for (const { name, script, required } of scripts) {
  console.log(`\n📋 ${name}...`);
  try {
    execSync(script, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log(`✅ ${name} completed`);
    successCount++;
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    if (required) {
      errors.push({ name, error: error.message });
      failCount++;
    } else {
      console.log(`⚠️  ${name} failed but is not required, continuing...`);
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);

if (errors.length > 0) {
  console.log('\n❌ Required scripts that failed:');
  errors.forEach(({ name, error }) => {
    console.log(`   - ${name}: ${error}`);
  });
  process.exit(1);
}

console.log('\n✅ Chilean Privacy data population complete!');
console.log('\nNext steps:');
console.log('1. Run: npm run test:chilean-privacy-completeness');
console.log('2. Access: http://localhost:3001/chile-privacy');
console.log('3. Complete questionnaire at: /chile-privacy/dashboard/questionnaire\n');
