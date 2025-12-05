/**
 * Create controls from DORA requirements
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/local-db');

function readCollection(collectionName) {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeCollection(collectionName, data) {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function createControlsFromRequirements() {
  console.log('🔧 Creating controls from DORA requirements...\n');
  
  try {
    const requirements = readCollection('DORARequirement');
    const existingControls = readCollection('Control');
    
    console.log(`Found ${requirements.length} requirements`);
    console.log(`Found ${existingControls.length} existing controls`);
    
    if (existingControls.length > 0) {
      console.log('Controls already exist. Skipping creation.');
      return;
    }
    
    const controls = [];
    let controlCounter = 1;
    
    // Group requirements by pillar and create controls
    const requirementsByPillar = {};
    requirements.forEach(req => {
      if (!requirementsByPillar[req.pillar]) {
        requirementsByPillar[req.pillar] = [];
      }
      requirementsByPillar[req.pillar].push(req);
    });
    
    for (const [pillar, pillarReqs] of Object.entries(requirementsByPillar)) {
      console.log(`\nProcessing ${pillar}: ${pillarReqs.length} requirements`);
      
      // Create controls from requirements
      for (const req of pillarReqs) {
        const controlId = `CTRL-${String(controlCounter).padStart(4, '0')}`;
        const reqId = req._id || req.requirementId;
        
        const control = {
          _id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          controlId: controlId,
          title: req.title || `Control for ${req.requirementId}`,
          description: req.description || req.legalText || '',
          pillar: pillar,
          requirementIds: [String(reqId)], // Link to requirement
          controlType: 'TRANSVERSAL', // Default to transversal
          minCriticalityLevel: 1, // Default minimum
          questions: [],
          status: 'NOT_IMPLEMENTED',
          complianceStatus: req.complianceStatus || 'NOT_APPLICABLE',
          iso27001Mappings: req.iso27001Mappings || [],
          notes: req.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        controls.push(control);
        controlCounter++;
      }
    }
    
    writeCollection('Control', controls);
    console.log(`\n✅ Created ${controls.length} controls from requirements`);
    
    // Now update questions to map to requirements
    console.log('\n🔗 Updating questions to map to requirements...');
    const questions = readCollection('Question');
    let updatedQuestions = 0;
    
    for (const question of questions) {
      if (!question.options) continue;
      
      const yesOption = question.options.find(o => o.value === 'yes');
      if (!yesOption) continue;
      
      // Find requirements that match this question's pillar and keywords
      const pillarReqs = requirements.filter(r => r.pillar === question.pillar);
      const questionKeywords = question.text.toLowerCase().split(' ').filter(w => w.length > 3);
      
      const matchingRequirements = pillarReqs.filter(req => {
        const reqText = `${req.description || ''} ${req.title || ''}`.toLowerCase();
        return questionKeywords.some(keyword => reqText.includes(keyword));
      }).slice(0, 20); // Limit to 20 requirements per question
      
      if (matchingRequirements.length > 0) {
        // Map to control IDs (which map to requirements)
        const matchingControlIds = controls
          .filter(c => {
            return matchingRequirements.some(req => {
              const reqId = String(req._id || req.requirementId);
              return c.requirementIds && c.requirementIds.includes(reqId);
            });
          })
          .map(c => c._id)
          .slice(0, 20);
        
        if (matchingControlIds.length > 0) {
          yesOption.applicableControls = matchingControlIds;
          updatedQuestions++;
        }
      }
    }
    
    writeCollection('Question', questions);
    console.log(`✅ Updated ${updatedQuestions} questions with control mappings`);
    
    console.log('\n📊 Summary:');
    console.log(`  • Controls created: ${controls.length}`);
    console.log(`  • Questions updated: ${updatedQuestions}`);
    console.log(`  • Controls by pillar:`);
    const controlsByPillar = {};
    controls.forEach(c => {
      controlsByPillar[c.pillar] = (controlsByPillar[c.pillar] || 0) + 1;
    });
    Object.entries(controlsByPillar).forEach(([pillar, count]) => {
      console.log(`    - ${pillar}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

createControlsFromRequirements()
  .then(() => {
    console.log('\n🎉 Control creation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });

