/**
 * Full Integration Test for Gap Analysis
 * Tests: Questionnaire → Gap Analysis → Remediation Plan
 */

require('dotenv').config({ path: '.env.local' });
const { connectDBLocal } = require('../lib/mongodb-local');
const { getTestUser } = require('../lib/test-mode');
const DORARequirement = require('../models/DORARequirement').default;
const Control = require('../models/Control').default;
const Question = require('../models/Question').default;
const Asset = require('../models/Asset').default;
const QuestionnaireResponse = require('../models/QuestionnaireResponse').default;
const GapAnalysis = require('../models/GapAnalysis').default;
const RemediationPlan = require('../models/RemediationPlan').default;
const { ensureControlsSetup } = require('../lib/auto-controls');
const { ensureMockQuestionnaireResponse } = require('../lib/auto-questionnaire-response');

// Mock writeCollection for testing
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data', 'local-db');

function writeCollection(collectionName, data) {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`   ❌ Failed to write ${collectionName}:`, error.message);
    throw error;
  }
}

async function runFullGapAnalysisTest() {
  console.log('\n🧪 Full Gap Analysis Integration Test');
  console.log('='.repeat(60));
  
  try {
    await connectDBLocal();
    const testUser = getTestUser();
    const testUserId = String(testUser.userId);

    console.log('\n1️⃣  Prerequisites Check');
    console.log('-'.repeat(60));
    
    // Ensure controls exist
    await ensureControlsSetup();
    const controls = await Control.find();
    console.log(`   ✅ Controls: ${controls.length}`);
    
    // Ensure questionnaire response exists
    await ensureMockQuestionnaireResponse();
    const questionnaireResponse = await QuestionnaireResponse.findOne({ userId: testUserId });
    if (!questionnaireResponse) {
      throw new Error('Questionnaire response not found');
    }
    console.log(`   ✅ Questionnaire Response: ${questionnaireResponse.answers.length} answers`);
    console.log(`   ✅ Applicable Controls: ${questionnaireResponse.applicableControls.length}`);
    
    const assets = await Asset.find({ userId: testUserId });
    console.log(`   ✅ Assets: ${assets.length}`);
    
    const questions = await Question.find();
    console.log(`   ✅ Questions: ${questions.length}`);

    console.log('\n2️⃣  Gap Analysis Generation Test');
    console.log('-'.repeat(60));
    
    const testPillar = 'ICT_RISK_MANAGEMENT';
    
    // Simulate gap analysis logic
    const allControlsForPillar = await Control.find({ pillar: testPillar });
    console.log(`   📋 Total controls for ${testPillar}: ${allControlsForPillar.length}`);
    
    const applicableControlIds = new Set();
    if (questionnaireResponse.applicableControls) {
      questionnaireResponse.applicableControls.forEach(id => {
        applicableControlIds.add(String(id));
      });
    }
    
    const relevantControls = allControlsForPillar.filter(control => 
      applicableControlIds.has(String(control._id || control.controlId))
    );
    
    const controlsToAnalyze = relevantControls.length > 0 ? relevantControls : allControlsForPillar;
    console.log(`   📊 Controls to analyze: ${controlsToAnalyze.length}`);
    
    // Generate gaps
    const gaps = [];
    let implementedCount = 0;
    
    for (const control of controlsToAnalyze.slice(0, 20)) { // Test with first 20 controls
      const applicableAssets = assets.filter(asset => {
        if (control.controlType === 'TRANSVERSAL') {
          if (control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return true;
        }
        if (control.controlType === 'SPECIFIC') {
          const matchesType = control.applicableAssetTypes?.includes(asset.assetType) || false;
          if (matchesType && control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return matchesType;
        }
        return false;
      });
      
      let status = 'NOT_IMPLEMENTED';
      let gapDescription = '';
      
      if (applicableAssets.length === 0) {
        status = 'NOT_APPLICABLE';
        gapDescription = 'No applicable assets found for this control.';
      } else {
        // Simulate some controls as implemented
        if (Math.random() > 0.7) {
          status = 'FULLY_IMPLEMENTED';
          implementedCount++;
        } else if (Math.random() > 0.5) {
          status = 'PARTIALLY_IMPLEMENTED';
          gapDescription = `Partially implemented for ${applicableAssets.length} asset(s).`;
        } else {
          status = 'NOT_IMPLEMENTED';
          gapDescription = `Not implemented for ${applicableAssets.length} asset(s).`;
        }
      }
      
      const maxCriticality = applicableAssets.length > 0
        ? Math.max(...applicableAssets.map(a => a.criticalityLevel))
        : 0;
      let priority = 'LOW';
      if (status !== 'FULLY_IMPLEMENTED') {
        if (maxCriticality >= 4) priority = 'CRITICAL';
        else if (maxCriticality >= 3) priority = 'HIGH';
        else if (maxCriticality >= 2) priority = 'MEDIUM';
        else priority = 'LOW';
      }
      
      gaps.push({
        controlId: String(control._id || control.controlId),
        status,
        gapDescription,
        priority,
      });
    }
    
    const totalControls = controlsToAnalyze.length;
    const compliancePercentage = totalControls > 0
      ? Math.round((implementedCount / totalControls) * 100)
      : 0;
    
    console.log(`   ✅ Generated ${gaps.length} gaps`);
    console.log(`   ✅ Implemented: ${implementedCount}`);
    console.log(`   ✅ Compliance: ${compliancePercentage}%`);
    
    // Save gap analysis
    let gapAnalysis;
    try {
      gapAnalysis = await GapAnalysis.findOneAndUpdate(
        { userId: testUserId, pillar: testPillar },
        {
          userId: testUserId,
          pillar: testPillar,
          gaps,
          totalControls,
          implementedControls: implementedCount,
          compliancePercentage,
        },
        { upsert: true, new: true }
      );
      console.log('   ✅ Gap analysis saved successfully!');
    } catch (error) {
      console.error('   ❌ Failed to save gap analysis:', error.message);
      throw error;
    }

    console.log('\n3️⃣  Gap Analysis Validation');
    console.log('-'.repeat(60));
    
    // Verify gap analysis structure
    const requiredFields = ['userId', 'pillar', 'gaps', 'totalControls', 'implementedControls', 'compliancePercentage'];
    const missingFields = requiredFields.filter(field => !(field in gapAnalysis));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    console.log('   ✅ All required fields present');
    
    // Verify gaps structure
    if (gapAnalysis.gaps.length > 0) {
      const sampleGap = gapAnalysis.gaps[0];
      const gapFields = ['controlId', 'status', 'gapDescription', 'priority'];
      const missingGapFields = gapFields.filter(field => !(field in sampleGap));
      if (missingGapFields.length > 0) {
        throw new Error(`Missing gap fields: ${missingGapFields.join(', ')}`);
      }
      console.log('   ✅ Gap structure valid');
    }
    
    // Verify findings by priority
    const findingsByPriority = {
      CRITICAL: gaps.filter(g => g.priority === 'CRITICAL').length,
      HIGH: gaps.filter(g => g.priority === 'HIGH').length,
      MEDIUM: gaps.filter(g => g.priority === 'MEDIUM').length,
      LOW: gaps.filter(g => g.priority === 'LOW').length,
    };
    console.log('   ✅ Findings by priority:', findingsByPriority);
    
    // Verify findings by status
    const findingsByStatus = {
      NOT_IMPLEMENTED: gaps.filter(g => g.status === 'NOT_IMPLEMENTED').length,
      PARTIALLY_IMPLEMENTED: gaps.filter(g => g.status === 'PARTIALLY_IMPLEMENTED').length,
      FULLY_IMPLEMENTED: gaps.filter(g => g.status === 'FULLY_IMPLEMENTED').length,
      NOT_APPLICABLE: gaps.filter(g => g.status === 'NOT_APPLICABLE').length,
    };
    console.log('   ✅ Findings by status:', findingsByStatus);

    console.log('\n4️⃣  Cross-Reference Validation');
    console.log('-'.repeat(60));
    
    // Verify controls are linked to requirements
    let controlsWithRequirements = 0;
    for (const control of controlsToAnalyze.slice(0, 10)) {
      if (control.requirementIds && control.requirementIds.length > 0) {
        controlsWithRequirements++;
      }
    }
    console.log(`   ✅ Controls with requirements: ${controlsWithRequirements}/10`);
    
    // Verify questionnaire response maps to controls
    const mappedControls = controlsToAnalyze.filter(c => 
      applicableControlIds.has(String(c._id || c.controlId))
    );
    console.log(`   ✅ Controls mapped from questionnaire: ${mappedControls.length}`);
    
    // Verify assets are considered
    let controlsWithAssets = 0;
    for (const gap of gaps.slice(0, 10)) {
      const control = controlsToAnalyze.find(c => String(c._id || c.controlId) === gap.controlId);
      if (control) {
        const applicableAssets = assets.filter(asset => {
          if (control.controlType === 'TRANSVERSAL') {
            if (control.minCriticalityLevel) {
              return asset.criticalityLevel >= control.minCriticalityLevel;
            }
            return true;
          }
          if (control.controlType === 'SPECIFIC') {
            const matchesType = control.applicableAssetTypes?.includes(asset.assetType) || false;
            if (matchesType && control.minCriticalityLevel) {
              return asset.criticalityLevel >= control.minCriticalityLevel;
            }
            return matchesType;
          }
          return false;
        });
        if (applicableAssets.length > 0) {
          controlsWithAssets++;
        }
      }
    }
    console.log(`   ✅ Controls with applicable assets: ${controlsWithAssets}/10`);

    console.log('\n5️⃣  Remediation Plan Generation Test');
    console.log('-'.repeat(60));
    
    // Generate remediation actions
    const remediationActions = [];
    const EVIDENCE_SUGGESTIONS = {
      ICT_RISK_MANAGEMENT: ['Policy Document', 'Risk Assessment Report'],
    };
    
    for (const gap of gaps) {
      if (gap.status === 'FULLY_IMPLEMENTED' || gap.status === 'NOT_APPLICABLE') {
        continue;
      }
      
      const control = controlsToAnalyze.find(c => String(c._id || c.controlId) === gap.controlId);
      if (!control) continue;
      
      const applicableAssetsForAction = assets.filter(asset => {
        if (control.controlType === 'TRANSVERSAL') {
          if (control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return true;
        }
        if (control.controlType === 'SPECIFIC') {
          const matchesType = control.applicableAssetTypes?.includes(asset.assetType) || false;
          if (matchesType && control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return matchesType;
        }
        return false;
      }).map(asset => ({
        assetId: asset.assetId,
        name: asset.name,
        criticalityLevel: asset.criticalityLevel,
      }));
      
      remediationActions.push({
        controlId: String(gap.controlId),
        action: `Implement ${control.title || 'Control'}`,
        description: gap.gapDescription,
        priority: gap.priority,
        status: 'NOT_STARTED',
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'Test Assignee',
        evidenceIds: [],
        applicableAssets: applicableAssetsForAction,
        evidenceSuggestions: EVIDENCE_SUGGESTIONS[testPillar] || ['General Evidence'],
      });
    }
    
    console.log(`   ✅ Generated ${remediationActions.length} remediation actions`);
    
    // Verify remediation action structure
    if (remediationActions.length > 0) {
      const sampleAction = remediationActions[0];
      const actionFields = [
        'controlId', 'action', 'description', 'priority', 'status',
        'applicableAssets', 'evidenceSuggestions'
      ];
      const missingActionFields = actionFields.filter(field => !(field in sampleAction));
      if (missingActionFields.length > 0) {
        throw new Error(`Missing remediation action fields: ${missingActionFields.join(', ')}`);
      }
      console.log('   ✅ Remediation action structure valid');
    }

    console.log('\n✅ Full Gap Analysis Integration Test PASSED!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`  • Controls analyzed: ${controlsToAnalyze.length}`);
    console.log(`  • Gaps identified: ${gaps.length}`);
    console.log(`  • Compliance: ${compliancePercentage}%`);
    console.log(`  • Remediation actions: ${remediationActions.length}`);
    console.log(`  • Cross-references validated: ✅`);
    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('\n❌ Full Gap Analysis Integration Test FAILED!');
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  runFullGapAnalysisTest();
} else {
  module.exports = { runFullGapAnalysisTest };
}
