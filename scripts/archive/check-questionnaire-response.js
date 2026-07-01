/**
 * Check Questionnaire Response Status
 * 
 * This script checks if the questionnaire response needs to be regenerated
 * after updating the question-to-requirement mappings.
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
    console.error(`Error reading ${collectionName}:`, error.message);
    return [];
  }
}

async function checkQuestionnaireResponse() {
  console.log('\n🔍 Checking Questionnaire Response Status\n');
  
  // Get all questionnaire responses
  const responses = readCollection('QuestionnaireResponse');
  const questions = readCollection('Question');
  const controls = readCollection('Control');
  
  if (responses.length === 0) {
    console.log('❌ No questionnaire responses found!');
    console.log('   You need to submit a questionnaire first.\n');
    return;
  }
  
  console.log(`Found ${responses.length} questionnaire response(s)\n`);
  
  for (const response of responses) {
    console.log('='.repeat(70));
    console.log(`Questionnaire Response for User: ${response.userId}`);
    console.log('='.repeat(70));
    
    console.log(`\n📋 Response Details:`);
    console.log(`   Answers: ${response.answers?.length || 0}`);
    console.log(`   Applicable Controls: ${response.applicableControls?.length || 0}`);
    console.log(`   Completed At: ${response.completedAt || 'N/A'}`);
    
    if (!response.applicableControls || response.applicableControls.length === 0) {
      console.log(`\n   ⚠️  WARNING: No applicable controls calculated!`);
      console.log(`   This means the gap analysis will show ALL controls for each pillar.`);
      console.log(`   Solution: Resubmit the questionnaire to recalculate with new mappings.\n`);
      continue;
    }
    
    // Check how many controls are in the response
    const applicableControlIds = new Set(
      response.applicableControls.map(id => String(id))
    );
    
    console.log(`\n📊 Control Analysis:`);
    console.log(`   Unique control IDs in response: ${applicableControlIds.size}`);
    
    // Check how many controls exist for each pillar
    const pillars = ['ICT_RISK_MANAGEMENT', 'THIRD_PARTY_RISK', 'INCIDENT_MANAGEMENT', 'INFORMATION_SHARING', 'TESTING'];
    const pillarStats = {};
    
    for (const pillar of pillars) {
      const pillarControls = controls.filter(c => c.pillar === pillar);
      const matchingControls = pillarControls.filter(c => {
        const cId1 = String(c._id || '');
        const cId2 = String(c.controlId || '');
        return applicableControlIds.has(cId1) || applicableControlIds.has(cId2);
      });
      
      pillarStats[pillar] = {
        total: pillarControls.length,
        matching: matchingControls.length,
        percentage: pillarControls.length > 0 
          ? ((matchingControls.length / pillarControls.length) * 100).toFixed(1)
          : '0.0'
      };
    }
    
    console.log(`\n   Controls by Pillar:`);
    for (const [pillar, stats] of Object.entries(pillarStats)) {
      const status = stats.matching === stats.total ? '⚠️  ALL' : 
                     stats.matching > stats.total * 0.8 ? '⚠️  TOO MANY' : 
                     stats.matching > 0 ? '✅ OK' : '❌ NONE';
      console.log(`     ${pillar}:`);
      console.log(`       ${status} ${stats.matching}/${stats.total} (${stats.percentage}%)`);
      
      if (stats.matching === stats.total) {
        console.log(`       ⚠️  WARNING: All controls included! This suggests old mappings.`);
      } else if (stats.matching > stats.total * 0.8) {
        console.log(`       ⚠️  WARNING: Too many controls (${stats.percentage}%)!`);
      }
    }
    
    // Check if this looks like old mappings
    const totalControls = controls.length;
    const responsePercentage = ((applicableControlIds.size / totalControls) * 100).toFixed(1);
    
    console.log(`\n   Overall:`);
    console.log(`     Response has ${applicableControlIds.size} controls out of ${totalControls} total`);
    console.log(`     That's ${responsePercentage}% of all controls`);
    
    if (responsePercentage > 50) {
      console.log(`\n   ❌ PROBLEM: Response includes >50% of all controls!`);
      console.log(`   This suggests it was created with OLD mappings (before improvements).`);
      console.log(`   Solution: Resubmit the questionnaire to use NEW improved mappings.\n`);
    } else if (responsePercentage > 20) {
      console.log(`\n   ⚠️  WARNING: Response includes ${responsePercentage}% of controls.`);
      console.log(`   This might be too many. Consider resubmitting.\n`);
    } else {
      console.log(`\n   ✅ Response looks reasonable (${responsePercentage}% of controls).\n`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 SOLUTION');
  console.log('='.repeat(70));
  console.log(`
If the questionnaire response has too many controls, you need to:

1. Resubmit the questionnaire through the UI
   - This will recalculate applicableControls using the NEW improved mappings
   - The new mappings should result in 10-20 controls per question (not 200+)

2. OR delete and recreate the questionnaire response
   - Delete the old response
   - Submit a new one
   - It will use the new mappings automatically

3. Then regenerate the gap analysis
   - The gap analysis will use the updated questionnaire response
   - You should see much fewer controls (10-20 instead of 97)
`);
}

checkQuestionnaireResponse()
  .then(() => {
    console.log('✅ Check completed\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
