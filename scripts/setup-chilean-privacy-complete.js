#!/usr/bin/env node

/**
 * Complete setup script for Chilean Privacy
 * This script sets up everything needed for Chilean Privacy:
 * 1. Imports requirements
 * 2. Creates controls from ISO 27701
 * 3. Adds ISO 27002 controls
 * 4. Maps requirements to controls
 * 5. Precomputes question→requirement mappings
 */

const { execSync } = require('child_process');
const path = require('path');

async function runCommand(command, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${description}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_OPTIONS: '--loader tsx/esm' }
    });
    console.log(`\n✅ ${description} - Complete\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} - Failed`);
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

async function setupChileanPrivacyComplete() {
  console.log('\n🚀 Starting Complete Chilean Privacy Setup...\n');
  console.log('This will set up:');
  console.log('  1. Requirements (from Chilean Privacy Law)');
  console.log('  2. Controls (from ISO 27701 and ISO 27002)');
  console.log('  3. Requirement→Control mappings');
  console.log('  4. Question→Requirement mappings (NLP-based)');
  console.log('\n');

  const steps = [
    {
      command: 'npx tsx scripts/import-chilean-privacy-requirements.js',
      description: 'Step 1: Importing Chilean Privacy requirements'
    },
    {
      command: 'npx tsx scripts/create-chilean-privacy-controls.js',
      description: 'Step 2: Creating controls from ISO 27701'
    },
    {
      command: 'npx tsx scripts/add-iso27002-controls-chilean-privacy.js',
      description: 'Step 3: Adding ISO 27002 controls'
    },
    {
      command: 'npx tsx scripts/map-chilean-privacy-requirements-to-controls.js',
      description: 'Step 4: Mapping requirements to controls'
    },
    {
      command: 'npm run precompute:mappings:privacy',
      description: 'Step 5: Precomputing question→requirement mappings'
    }
  ];

  let successCount = 0;
  let failedSteps = [];

  for (const step of steps) {
    const success = await runCommand(step.command, step.description);
    if (success) {
      successCount++;
    } else {
      failedSteps.push(step.description);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Setup Summary');
  console.log('='.repeat(60));
  console.log(`✅ Completed: ${successCount}/${steps.length} steps`);
  
  if (failedSteps.length > 0) {
    console.log(`\n❌ Failed steps:`);
    failedSteps.forEach(step => console.log(`   - ${step}`));
    console.log('\n⚠️  Some steps failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All steps completed successfully!');
    console.log('\n🎉 Chilean Privacy setup is complete!');
    console.log('   You can now:');
    console.log('   - Answer the questionnaire');
    console.log('   - Generate gap analysis');
    console.log('   - View applicable controls');
    console.log('\n');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  setupChileanPrivacyComplete().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { setupChileanPrivacyComplete };
