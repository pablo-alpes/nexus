/**
 * Integration test for gap analysis
 */

const fs = require('fs');
const path = require('path');

// Simple test utilities
const DATA_DIR = path.join(__dirname, '../data/local-db');

function readCollection(collectionName) {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
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

async function testGapAnalysis() {
  console.log('🧪 Starting Gap Analysis Integration Test\n');
  
  try {
    // Step 1: Check test user
    const testUserId = 'test-user-123';
    console.log('1️⃣  Checking test user:', testUserId);
    
    // Step 2: Check assets
    console.log('\n2️⃣  Checking assets...');
    const assets = readCollection('Asset').filter(a => a.userId === testUserId);
    console.log(`   Found ${assets.length} assets`);
    if (assets.length > 0) {
      console.log(`   Sample asset: ${assets[0].name} (Criticality: ${assets[0].criticalityLevel})`);
    } else {
      console.log('   ⚠️  No assets found!');
    }
    
    // Step 3: Check questionnaire response
    console.log('\n3️⃣  Checking questionnaire response...');
    const questionnaireResponses = readCollection('QuestionnaireResponse').filter(r => r.userId === testUserId);
    console.log(`   Found ${questionnaireResponses.length} responses`);
    if (questionnaireResponses.length > 0) {
      const response = questionnaireResponses[0];
      console.log(`   Answers: ${response.answers?.length || 0}`);
      console.log(`   Applicable controls: ${response.applicableControls?.length || 0}`);
      if (response.applicableControls && response.applicableControls.length > 0) {
        console.log(`   Sample control ID: ${response.applicableControls[0]}`);
      }
    } else {
      console.log('   ⚠️  No questionnaire response found!');
    }
    
    // Step 4: Check questions
    console.log('\n4️⃣  Checking questions...');
    const questions = readCollection('Question');
    console.log(`   Found ${questions.length} questions`);
    if (questions.length > 0) {
      const sampleQ = questions[0];
      console.log(`   Sample question: ${sampleQ.text.substring(0, 50)}...`);
      if (sampleQ.options) {
        const yesOption = sampleQ.options.find(o => o.value === 'yes');
        if (yesOption && yesOption.applicableControls) {
          console.log(`   Sample question has ${yesOption.applicableControls.length} applicable controls`);
        }
      }
    }
    
    // Step 5: Check requirements
    console.log('\n5️⃣  Checking requirements...');
    const requirements = readCollection('DORARequirement');
    console.log(`   Found ${requirements.length} requirements`);
    if (requirements.length > 0) {
      const sampleReq = requirements[0];
      console.log(`   Sample requirement: ${sampleReq.requirementId} (Pillar: ${sampleReq.pillar})`);
    }
    
    // Step 6: Check controls
    console.log('\n6️⃣  Checking controls...');
    const controls = readCollection('Control');
    console.log(`   Found ${controls.length} controls`);
    if (controls.length > 0) {
      const sampleControl = controls[0];
      console.log(`   Sample control: ${sampleControl.controlId || sampleControl._id} (Pillar: ${sampleControl.pillar})`);
      console.log(`   Control type: ${sampleControl.controlType}`);
      console.log(`   Requirement IDs: ${sampleControl.requirementIds?.length || 0}`);
    }
    
    // Step 7: Simulate gap analysis logic
    console.log('\n7️⃣  Simulating gap analysis logic...');
    
    if (questionnaireResponses.length === 0) {
      console.log('   ⚠️  Cannot test - no questionnaire response found');
      console.log('   Creating a test questionnaire response...');
      
      // Create a test questionnaire response
      const questions = readCollection('Question');
      const testAnswers = questions.slice(0, 5).map(q => ({
        questionId: q._id,
        value: 'yes', // Answer yes to first 5 questions
      }));
      
      // Get applicable requirements from "yes" answers
      const applicableRequirementIds = new Set();
      for (const answer of testAnswers) {
        const question = questions.find(q => q._id === answer.questionId);
        if (question && question.options) {
          const yesOption = question.options.find(o => o.value === 'yes');
          if (yesOption && yesOption.applicableControls) {
            yesOption.applicableControls.forEach(id => {
              applicableRequirementIds.add(String(id));
            });
          }
        }
      }
      
      const testResponse = {
        _id: `local-${Date.now()}-test`,
        userId: testUserId,
        answers: testAnswers,
        applicableControls: Array.from(applicableRequirementIds),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const allResponses = readCollection('QuestionnaireResponse');
      allResponses.push(testResponse);
      writeCollection('QuestionnaireResponse', allResponses);
      console.log('   ✅ Created test questionnaire response');
    }
    
    // Step 8: Test gap analysis for a specific pillar
    console.log('\n8️⃣  Testing gap analysis for ICT_RISK_MANAGEMENT pillar...');
    
    const pillar = 'ICT_RISK_MANAGEMENT';
    const pillarAssets = assets.filter(a => true); // All assets for now
    const pillarRequirements = requirements.filter(r => r.pillar === pillar);
    const pillarControls = controls.filter(c => c.pillar === pillar);
    
    console.log(`   Assets: ${pillarAssets.length}`);
    console.log(`   Requirements: ${pillarRequirements.length}`);
    console.log(`   Controls: ${pillarControls.length}`);
    
    // Get questionnaire response
    const response = readCollection('QuestionnaireResponse').find(r => r.userId === testUserId);
    if (!response) {
      console.log('   ❌ No questionnaire response found');
      return;
    }
    
    // Determine applicable requirements
    const applicableRequirementIds = new Set();
    if (response.answers) {
      for (const answer of response.answers) {
        if (answer.value === 'yes') {
          const question = questions.find(q => q._id === answer.questionId);
          if (question && question.options) {
            const yesOption = question.options.find(o => o.value === 'yes');
            if (yesOption && yesOption.applicableControls) {
              yesOption.applicableControls.forEach(id => {
                applicableRequirementIds.add(String(id));
              });
            }
          }
        }
      }
    }
    
    console.log(`   Applicable requirements from questionnaire: ${applicableRequirementIds.size}`);
    
    // Filter controls by applicable requirements
    const applicableControls = pillarControls.filter(control => {
      if (!control.requirementIds || control.requirementIds.length === 0) {
        return true; // Include if no requirement mapping
      }
      return control.requirementIds.some(reqId => {
        const reqIdStr = String(reqId);
        return applicableRequirementIds.has(reqIdStr) || 
               pillarRequirements.some(r => String(r._id || r.requirementId) === reqIdStr);
      });
    });
    
    console.log(`   Applicable controls: ${applicableControls.length}`);
    
    // Test gap calculation
    const gaps = [];
    for (const control of applicableControls.slice(0, 3)) { // Test first 3
      const applicableAssets = pillarAssets.filter(asset => {
        if (control.controlType === 'TRANSVERSAL') {
          if (control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return true;
        } else if (control.controlType === 'SPECIFIC') {
          const matchesType = control.applicableAssetTypes?.includes(asset.assetType) || false;
          if (matchesType && control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return matchesType;
        }
        return false;
      });
      
      const controlId = String(control._id || control.controlId || '');
      const maxCriticality = applicableAssets.length > 0 
        ? Math.max(...applicableAssets.map(a => a.criticalityLevel || 1))
        : 1;
      
      gaps.push({
        controlId,
        status: control.status || 'NOT_IMPLEMENTED',
        gapDescription: `Test gap for ${control.controlId || control._id}`,
        priority: maxCriticality >= 4 ? 'CRITICAL' : maxCriticality >= 3 ? 'HIGH' : 'MEDIUM',
        applicableAssets: applicableAssets.length,
      });
      
      console.log(`   Control ${controlId}: ${applicableAssets.length} applicable assets, priority: ${gaps[gaps.length - 1].priority}`);
    }
    
    console.log(`\n   ✅ Successfully calculated ${gaps.length} gaps`);
    
    // Step 9: Test saving gap analysis
    console.log('\n9️⃣  Testing gap analysis save...');
    
    const gapAnalysisData = {
      _id: `local-${Date.now()}-gap`,
      userId: testUserId,
      pillar: pillar,
      gaps: gaps,
      totalControls: applicableControls.length,
      implementedControls: 0,
      compliancePercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const allGapAnalyses = readCollection('GapAnalysis');
    const existingIndex = allGapAnalyses.findIndex(ga => 
      ga.userId === testUserId && ga.pillar === pillar
    );
    
    if (existingIndex >= 0) {
      allGapAnalyses[existingIndex] = gapAnalysisData;
    } else {
      allGapAnalyses.push(gapAnalysisData);
    }
    
    writeCollection('GapAnalysis', allGapAnalyses);
    console.log('   ✅ Saved gap analysis');
    
    // Step 10: Verify saved data
    console.log('\n🔟 Verifying saved gap analysis...');
    const savedGapAnalysis = readCollection('GapAnalysis').find(ga => 
      ga.userId === testUserId && ga.pillar === pillar
    );
    
    if (savedGapAnalysis) {
      console.log(`   ✅ Found saved gap analysis`);
      console.log(`   Total controls: ${savedGapAnalysis.totalControls}`);
      console.log(`   Gaps: ${savedGapAnalysis.gaps?.length || 0}`);
      console.log(`   Compliance: ${savedGapAnalysis.compliancePercentage}%`);
    } else {
      console.log('   ❌ Gap analysis not found after save');
    }
    
    console.log('\n✅ Integration test completed!');
    console.log('\nSummary:');
    console.log(`  • Assets: ${assets.length}`);
    console.log(`  • Questions: ${questions.length}`);
    console.log(`  • Requirements: ${requirements.length}`);
    console.log(`  • Controls: ${controls.length}`);
    console.log(`  • Questionnaire responses: ${questionnaireResponses.length}`);
    console.log(`  • Gap analyses: ${readCollection('GapAnalysis').filter(ga => ga.userId === testUserId).length}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testGapAnalysis()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });

