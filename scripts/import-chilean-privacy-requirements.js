/**
 * Import Chilean Privacy Law requirements from JSON file
 * Converts structured requirements into the database
 */

const { connectDBLocal } = require('../lib/mongodb-local');
// Use dynamic import for TypeScript modules
let RequirementOperations;
try {
  RequirementOperations = require('../lib/model-operations').RequirementOperations;
} catch (e) {
  // Fallback: create a simple wrapper
  RequirementOperations = {
    findByRegulation: async (regulationType, query) => {
      const DORARequirement = require('../models/DORARequirement').default;
      if (regulationType === 'CHILEAN_PRIVACY') {
        const allReqs = await DORARequirement.find({});
        return allReqs.filter((req) => {
          if (!req.requirementId?.startsWith('CHILE-')) return false;
          for (const [key, value] of Object.entries(query)) {
            if (key === 'requirementId') continue;
            if (req[key] !== value) return false;
          }
          return true;
        });
      }
      return await DORARequirement.find(query);
    },
  };
}
const DORARequirement = require('../models/DORARequirement').default;
const fs = require('fs');
const path = require('path');

// Try to load Requirement model, but fallback to DORARequirement if not available
let Requirement;
try {
  Requirement = require('../models/Requirement').default;
} catch (e) {
  Requirement = null;
}

const RegulationType = {
  DORA: 'DORA',
  CHILEAN_PRIVACY: 'CHILEAN_PRIVACY',
};

const REQUIREMENTS_FILE = path.join(__dirname, '../data/chilean-privacy-requirements.json');

async function importChileanPrivacyRequirements() {
  try {
    // Load models dynamically (TypeScript files)
    if (!DORARequirement) {
      const doraModule = await import('../models/DORARequirement.ts');
      DORARequirement = doraModule.default;
    }
    
    await connectDBLocal();
    
    console.log('🚀 Importing Chilean Privacy Law requirements...\n');
    
    // Check if file exists
    if (!fs.existsSync(REQUIREMENTS_FILE)) {
      console.error(`❌ Requirements file not found: ${REQUIREMENTS_FILE}`);
      console.error('   Please run fetch-chilean-privacy-law.js first\n');
      process.exit(1);
    }
    
    // Read requirements file
    const data = JSON.parse(fs.readFileSync(REQUIREMENTS_FILE, 'utf8'));
    const requirements = data.requirements || [];
    
    console.log(`📋 Found ${requirements.length} requirements to import\n`);
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    for (const req of requirements) {
      try {
        // Map to Requirement model structure with hierarchical fields
        const requirementData = {
          requirementId: req.requirementId,
          regulationType: RegulationType.CHILEAN_PRIVACY,
          chapter: req.chapter || null,
          article: req.article || null,
          paragraph: req.paragraph || null,
          literal: req.literal || null,
          nestedNumber: req.nestedNumber || null,
          level: req.level !== undefined ? req.level : 0,
          parentRequirementId: req.parentRequirementId || null,
          title: req.title,
          description: req.description,
          legalText: req.legalText,
          fullLegalText: req.fullLegalText || req.legalText,
          pillar: req.pillar,
          pillarConfidence: req.pillarConfidence || 'low',
          complianceStatus: req.complianceStatus || 'NOT_APPLICABLE',
          applicableTo: req.applicableTo || [],
          iso27001Mappings: req.iso27001Mappings || [],
          iso27701Mappings: req.iso27701Mappings || [],
        };
        
        // For now, we'll store with a prefix to distinguish from DORA requirements
        // This will be migrated to the Requirement model later
        // Check if requirementId already has CHILE- prefix
        const chileRequirementId = req.requirementId.startsWith('CHILE-') 
          ? req.requirementId 
          : `CHILE-${req.requirementId}`;
        
        // Use RequirementOperations for Chilean Privacy
        try {
          // Update requirementId to include CHILE- prefix if needed
          requirementData.requirementId = chileRequirementId;
          
          const existing = await RequirementOperations.findOne(
            RegulationType.CHILEAN_PRIVACY,
            { requirementId: chileRequirementId }
          );
          
          await RequirementOperations.upsert(
            RegulationType.CHILEAN_PRIVACY,
            requirementData
          );
          
          if (existing && existing._id) {
            updated++;
          } else {
            imported++;
          }
        } catch (opsError) {
          // Fallback to DORARequirement if RequirementOperations fails
          console.warn(`⚠️  RequirementOperations failed for ${req.requirementId}, using fallback`);
          const chileRequirementId = req.requirementId.startsWith('CHILE-') 
            ? req.requirementId 
            : `CHILE-${req.requirementId}`;
          
          const existing = await DORARequirement.findOne({ 
            requirementId: chileRequirementId,
          });
          
          if (existing) {
            await DORARequirement.findOneAndUpdate(
              { requirementId: chileRequirementId },
              {
                ...requirementData,
                requirementId: chileRequirementId,
                notes: `REGULATION_TYPE:${RegulationType.CHILEAN_PRIVACY}`,
              },
              { new: true }
            );
            updated++;
          } else {
            await DORARequirement.create({
              ...requirementData,
              requirementId: chileRequirementId,
              notes: `REGULATION_TYPE:${RegulationType.CHILEAN_PRIVACY}`,
            });
            imported++;
          }
        }
        
        if ((imported + updated) % 10 === 0) {
          process.stdout.write('.');
        }
      } catch (error) {
        errors++;
        console.error(`\n❌ Error importing ${req.requirementId}:`, error.message);
      }
    }
    
    console.log(`\n\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${imported + updated}\n`);
    
    // Print summary by pillar
    const pillarCounts = {};
    const allImported = await DORARequirement.find({ 
      requirementId: /^CHILE-/,
    });
    
    allImported.forEach(req => {
      pillarCounts[req.pillar] = (pillarCounts[req.pillar] || 0) + 1;
    });
    
    console.log('📊 Requirements by pillar:');
    Object.entries(pillarCounts).forEach(([pillar, count]) => {
      console.log(`   ${pillar}: ${count}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  importChileanPrivacyRequirements()
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { importChileanPrivacyRequirements };
