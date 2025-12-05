/**
 * Script to map ISO 27002/27005 controls to actual DORA requirement IDs
 */

const fs = require('fs');
const path = require('path');

// Load DORA requirements
const doraPath = path.join(__dirname, '../data/dora-requirements-final.json');
const doraData = JSON.parse(fs.readFileSync(doraPath, 'utf8'));
const requirements = doraData.requirements || [];

// Group requirements by pillar
const reqsByPillar = {};
requirements.forEach(req => {
  if (!reqsByPillar[req.pillar]) {
    reqsByPillar[req.pillar] = [];
  }
  reqsByPillar[req.pillar].push(req);
});

console.log('DORA Requirements by pillar:');
Object.keys(reqsByPillar).forEach(pillar => {
  console.log(`  ${pillar}: ${reqsByPillar[pillar].length} requirements`);
});

// Load ISO controls
const isoPath = path.join(__dirname, '../data/iso27002-controls.json');
const isoData = JSON.parse(fs.readFileSync(isoPath, 'utf8'));
const isoControls = isoData.controls || [];

console.log(`\nMapping ${isoControls.length} ISO controls to DORA requirements...\n`);

// Map ISO controls to DORA requirements
let mappedCount = 0;
for (const control of isoControls) {
  const pillar = control.pillar;
  const pillarReqs = reqsByPillar[pillar] || [];
  
  if (pillarReqs.length === 0) {
    console.log(`⚠️  No requirements found for pillar ${pillar}`);
    continue;
  }
  
  // If control has specific requirement IDs, validate them
  if (control.doraRequirements && Array.isArray(control.doraRequirements)) {
    const validReqs = control.doraRequirements.filter(reqId => {
      return requirements.some(r => r.requirementId === reqId);
    });
    
    if (validReqs.length === 0) {
      // Map to first few requirements from this pillar
      control.doraRequirements = pillarReqs.slice(0, 5).map(r => r.requirementId);
      mappedCount++;
    } else {
      control.doraRequirements = validReqs;
    }
  } else {
    // Map to first few requirements from this pillar
    control.doraRequirements = pillarReqs.slice(0, 5).map(r => r.requirementId);
    mappedCount++;
  }
}

// Save updated ISO controls
isoData.controls = isoControls;
fs.writeFileSync(isoPath, JSON.stringify(isoData, null, 2));

console.log(`✅ Mapped ${mappedCount} controls to DORA requirements`);
console.log(`✅ Updated ${isoPath}`);

// Show sample mappings
console.log('\nSample mappings:');
isoControls.slice(0, 5).forEach(control => {
  console.log(`  ${control.controlId} (${control.pillar}):`);
  console.log(`    Requirements: ${control.doraRequirements?.slice(0, 3).join(', ')}${control.doraRequirements?.length > 3 ? '...' : ''}`);
});

