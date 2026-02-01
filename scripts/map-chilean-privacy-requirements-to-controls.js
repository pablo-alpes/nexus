/**
 * Map Chilean Privacy requirements to controls
 * Similar to map-iso-to-dora.js but for Chilean Privacy
 */

const { connectDBLocal } = require('../lib/mongodb-local.js');
let RequirementOperations, ControlOperations;
const fs = require('fs');
const path = require('path');

async function mapRequirementsToControls() {
  try {
    console.log('🚀 Mapping Chilean Privacy requirements to controls...\n');
    
    // Load model operations
    const opsModule = await import('../lib/model-operations.ts');
    const moduleExports = opsModule.default || opsModule;
    RequirementOperations = moduleExports.RequirementOperations || opsModule.RequirementOperations;
    ControlOperations = moduleExports.ControlOperations || opsModule.ControlOperations;
    
    if (!RequirementOperations || !ControlOperations) {
      throw new Error('Failed to load model operations');
    }
    
    await connectDBLocal();
    
    // Get all Chilean Privacy requirements
    const requirements = await RequirementOperations.findByRegulation('CHILEAN_PRIVACY');
    console.log(`📋 Found ${requirements.length} requirements`);
    
    // Get all controls for Chilean Privacy pillars
    const chileanPrivacyPillars = [
      'LAWFULNESS_FAIRNESS',
      'PURPOSE_LIMITATION',
      'DATA_MINIMIZATION',
      'PROPORTIONALITY',
      'QUALITY',
      'ACCOUNTABILITY',
      'SECURITY',
      'TRANSPARENCY_CONFIDENTIALITY',
    ];
    
    const allControls = await ControlOperations.find({
      pillar: { $in: chileanPrivacyPillars }
    });
    console.log(`📋 Found ${allControls.length} controls\n`);
    
    // Group requirements by pillar
    const reqsByPillar = {};
    requirements.forEach(req => {
      const pillar = req.pillar || 'UNKNOWN';
      if (!reqsByPillar[pillar]) reqsByPillar[pillar] = [];
      reqsByPillar[pillar].push(req);
    });
    
    let mappedCount = 0;
    let updatedCount = 0;
    
    // For each control, map to requirements from the same pillar
    for (const control of allControls) {
      const pillar = control.pillar;
      const pillarReqs = reqsByPillar[pillar] || [];
      
      if (pillarReqs.length === 0) {
        console.log(`⚠️  No requirements found for pillar ${pillar}`);
        continue;
      }
      
      // Get current requirement IDs
      const currentReqIds = (control.requirementIds || []).map(String);
      
      // Map to first 3-5 requirements from this pillar (similar to DORA approach)
      const reqsToMap = pillarReqs.slice(0, 5).map(r => String(r._id || r.requirementId));
      
      // Only update if requirements changed
      const reqsChanged = reqsToMap.length !== currentReqIds.length ||
        reqsToMap.some(reqId => !currentReqIds.includes(reqId));
      
      if (reqsChanged) {
        await ControlOperations.findOneAndUpdate(
          { controlId: control.controlId },
          { requirementIds: reqsToMap },
          { new: true }
        );
        updatedCount++;
        mappedCount += reqsToMap.length;
      }
    }
    
    console.log(`\n✅ Mapping complete!`);
    console.log(`   Updated ${updatedCount} controls`);
    console.log(`   Total requirement mappings: ${mappedCount}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  mapRequirementsToControls()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { mapRequirementsToControls };
