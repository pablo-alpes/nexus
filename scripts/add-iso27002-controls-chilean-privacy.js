/**
 * Add ISO 27002 controls for Chilean Privacy (Security pillar)
 * Maps ISO 27002 controls to Chilean Privacy requirements
 */

const { connectDBLocal } = require('../lib/mongodb-local.js');
let RequirementOperations, ControlOperations;
const fs = require('fs');
const path = require('path');

const ISO27002_CONTROLS_PATH = path.join(__dirname, '../data/iso27002-controls.json');
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

async function addISO27002Controls() {
  try {
    console.log('🚀 Adding ISO 27002 controls for Chilean Privacy (Security)...\n');
    
    // Load model operations
    const opsModule = await import('../lib/model-operations.ts');
    const moduleExports = opsModule.default || opsModule;
    RequirementOperations = moduleExports.RequirementOperations || opsModule.RequirementOperations;
    ControlOperations = moduleExports.ControlOperations || opsModule.ControlOperations;
    
    if (!RequirementOperations || !ControlOperations) {
      throw new Error('Failed to load model operations');
    }
    
    await connectDBLocal();
    
    // Load ISO 27002 controls
    if (!fs.existsSync(ISO27002_CONTROLS_PATH)) {
      console.error('❌ ISO 27002 controls file not found:', ISO27002_CONTROLS_PATH);
      process.exit(1);
    }
    
    const isoData = JSON.parse(fs.readFileSync(ISO27002_CONTROLS_PATH, 'utf8'));
    const isoControls = isoData.controls || [];
    
    console.log(`📋 Found ${isoControls.length} ISO 27002 controls\n`);
    
    // Get Chilean Privacy requirements
    const requirements = await RequirementOperations.findByRegulation('CHILEAN_PRIVACY');
    console.log(`📋 Found ${requirements.length} Chilean Privacy requirements\n`);
    
    if (requirements.length === 0) {
      console.error('❌ No Chilean Privacy requirements found!');
      console.error('   Run: npx tsx scripts/import-chilean-privacy-requirements.js first\n');
      process.exit(1);
    }
    
    // Group requirements by pillar
    const reqsByPillar = {};
    requirements.forEach(req => {
      const pillar = req.pillar || 'UNKNOWN';
      if (!reqsByPillar[pillar]) reqsByPillar[pillar] = [];
      reqsByPillar[pillar].push(req);
    });
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    // Filter ISO 27002 controls that are relevant for security/privacy
    // Focus on controls that map to SECURITY pillar
    const securityControls = isoControls.filter(c => {
      // Include controls that are security-related
      const securityKeywords = ['security', 'access', 'encryption', 'authentication', 
                                'authorization', 'audit', 'backup', 'incident', 
                                'vulnerability', 'patch', 'network', 'firewall'];
      const title = (c.title || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      return securityKeywords.some(keyword => title.includes(keyword) || desc.includes(keyword));
    });
    
    console.log(`📋 Filtered to ${securityControls.length} security-related ISO 27002 controls\n`);
    
    // Create controls from ISO 27002
    for (const isoControl of securityControls) {
      try {
        // Map to SECURITY pillar for Chilean Privacy
        const pillar = 'SECURITY';
        
        // Find requirements that match this control
        const matchingReqs = [];
        
        // Try to match by pillar first
        const pillarReqs = reqsByPillar[pillar] || [];
        if (pillarReqs.length > 0) {
          // Map to first 3-5 requirements from SECURITY pillar
          matchingReqs.push(...pillarReqs.map(r => String(r._id || r.requirementId)).slice(0, 5));
        }
        
        // If no SECURITY pillar requirements, try other security-related pillars
        if (matchingReqs.length === 0) {
          // Try ACCOUNTABILITY as fallback (often related to security)
          const accountabilityReqs = reqsByPillar['ACCOUNTABILITY'] || [];
          if (accountabilityReqs.length > 0) {
            matchingReqs.push(...accountabilityReqs.map(r => String(r._id || r.requirementId)).slice(0, 3));
          }
        }
        
        const controlId = `ISO27002-${isoControl.controlId || isoControl.id || `CTRL-${Date.now()}`}`;
        
        const controlData = {
          controlId: controlId,
          title: isoControl.title || isoControl.name || 'ISO 27002 Control',
          description: isoControl.description || '',
          pillar: pillar,
          requirementIds: matchingReqs,
          controlType: 'TRANSVERSAL',
          minCriticalityLevel: isoControl.minCriticalityLevel || 1,
          iso27001Mappings: [{
            control: isoControl.controlId || isoControl.id || '',
            title: isoControl.title || '',
            description: isoControl.description || '',
            relevance: 'High',
          }],
          iso27701Mappings: [],
        };
        
        // Check if control exists
        const existing = await ControlOperations.findOne({ controlId: controlId });
        
        if (existing) {
          await ControlOperations.findOneAndUpdate(
            { controlId: controlId },
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
    
    console.log(`\n\n✅ ISO 27002 controls addition complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${created + updated}\n`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  addISO27002Controls()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { addISO27002Controls };
