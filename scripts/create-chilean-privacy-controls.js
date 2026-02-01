/**
 * Create controls for Chilean Privacy from ISO 27701
 * Maps ISO 27701 controls to Chilean Privacy requirements
 */

const { connectDBLocal } = require('../lib/mongodb-local.js');
// Use dynamic import for TypeScript models
// Use model operations abstraction
let RequirementOperations, ControlOperations;
const fs = require('fs');
const path = require('path');

// Try to load Requirement model, but fallback to DORARequirement if not available
let Requirement;
try {
  Requirement = require('../models/Requirement').default;
} catch (e) {
  Requirement = null;
}

const ISO27701_CONTROLS_PATH = path.join(__dirname, '../data/iso27701-controls.json');
const CHILEAN_PRIVACY_PILLARS = [
  'LAWFULNESS_FAIRNESS',
  'PURPOSE_LIMITATION',
  'DATA_MINIMIZATION',
  'PROPORTIONALITY',
  'QUALITY',
  'ACCOUNTABILITY',
  'SECURITY',
  'TRANSPARENCY_CONFIDENTIALITY',
];

async function createChileanPrivacyControls() {
  try {
    console.log('🚀 Creating controls for Chilean Privacy from ISO 27701...\n');
    
    // Load model operations abstraction
    const opsModule = await import('../lib/model-operations.ts');
    // Handle both ES module and CommonJS exports
    const moduleExports = opsModule.default || opsModule;
    RequirementOperations = moduleExports.RequirementOperations || opsModule.RequirementOperations;
    ControlOperations = moduleExports.ControlOperations || opsModule.ControlOperations;
    if (!RequirementOperations || !ControlOperations) {
      console.error('Available exports:', Object.keys(opsModule));
      throw new Error('Failed to load model operations');
    }
    
    

    // Load ISO 27701 controls
    if (!fs.existsSync(ISO27701_CONTROLS_PATH)) {
      console.error('❌ ISO 27701 controls file not found:', ISO27701_CONTROLS_PATH);
      console.error('   Please ensure data/iso27701-controls.json exists\n');
      process.exit(1);
    }

    const isoData = JSON.parse(fs.readFileSync(ISO27701_CONTROLS_PATH, 'utf8'));
    const isoControls = isoData.controls || [];

    console.log(`📋 Found ${isoControls.length} ISO 27701 controls\n`);

    // Get Chilean Privacy requirements using abstraction layer
    const requirements = await RequirementOperations.findByRegulation('CHILEAN_PRIVACY');
    
    console.log(`📋 Found ${requirements.length} Chilean Privacy requirements`);
    if (requirements.length > 0) {
      console.log(`   Sample IDs: ${requirements.slice(0, 3).map(r => r.requirementId).join(', ')}\n`);
    } else {
      console.log(`   ⚠️  No requirements found. Make sure to run import-chilean-privacy-requirements.js first\n`);
    }

    if (requirements.length === 0) {
      console.error('❌ No Chilean Privacy requirements found!');
      console.error('   Run: node scripts/import-chilean-privacy-requirements.js first\n');
      process.exit(1);
    }

    // Create a map of requirement IDs
    const reqMap = new Map();
    requirements.forEach(req => {
      reqMap.set(req.requirementId, req._id);
    });

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Create controls from ISO 27701
    for (const isoControl of isoControls) {
      try {
        // Find requirements that match this control
        const matchingReqs = [];
        
        if (isoControl.chileRequirements && Array.isArray(isoControl.chileRequirements)) {
          for (const reqId of isoControl.chileRequirements) {
            const req = requirements.find(r => r.requirementId === reqId);
            if (req) {
              matchingReqs.push(req._id);
            }
          }
        }

        // If no specific requirements, try to match by pillar
        if (matchingReqs.length === 0 && isoControl.pillar) {
          const pillarReqs = requirements.filter(r => r.pillar === isoControl.pillar);
          matchingReqs.push(...pillarReqs.map(r => r._id).slice(0, 5)); // Limit to 5
        }

        const controlData = {
          controlId: isoControl.controlId,
          title: isoControl.title,
          description: isoControl.description,
          pillar: isoControl.pillar,
          requirementIds: matchingReqs,
          controlType: 'TRANSVERSAL', // Most privacy controls are transversal
          minCriticalityLevel: isoControl.minCriticalityLevel || 1,
          iso27001Mappings: isoControl.iso27001Mapping ? [{
            control: isoControl.iso27001Mapping,
            title: isoControl.title,
            description: isoControl.description,
            relevance: 'High',
          }] : [],
          iso27701Mappings: [{
            control: isoControl.iso27701Control,
            title: isoControl.title,
            description: isoControl.description,
            relevance: 'High',
          }],
        };

        // Check if control exists
        const existing = await ControlOperations.findOne({ controlId: isoControl.controlId });
        
        if (existing) {
          await ControlOperations.findOneAndUpdate(
            { controlId: isoControl.controlId },
            controlData,
            { new: true }
          );
          updated++;
        } else {
          await ControlOperations.create(controlData);
          created++;
        }

        if ((created + updated) % 10 === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        errors++;
        console.error(`\n❌ Error creating control ${isoControl.controlId}:`, error.message);
      }
    }

    console.log(`\n\n✅ Controls creation complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${created + updated}\n`);

    // Print summary by pillar
    const pillarCounts = {};
    const allControls = await ControlOperations.find({ 
      pillar: { $in: CHILEAN_PRIVACY_PILLARS }
    });
    
    allControls.forEach(control => {
      pillarCounts[control.pillar] = (pillarCounts[control.pillar] || 0) + 1;
    });
    
    console.log('📊 Controls by pillar:');
    CHILEAN_PRIVACY_PILLARS.forEach(pillar => {
      console.log(`   ${pillar}: ${pillarCounts[pillar] || 0}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createChileanPrivacyControls()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { createChileanPrivacyControls };
