/**
 * Test script to verify mappings and data completeness
 */

const { connectDBLocal } = require('./lib/mongodb-local.js');
const { RequirementOperations } = require('./lib/model-operations.ts');
const Control = require('./models/Control').default;
const Question = require('./models/Question').default;
const QuestionMapping = require('./models/QuestionMapping').default;

async function test() {
  try {
    await connectDBLocal();
    
    console.log('\n🧪 Testing Chilean Privacy Data Completeness...\n');
    
    // Test 1: Requirements
    console.log('1️⃣  Testing Requirements...');
    const reqs = await RequirementOperations.findByRegulation('CHILEAN_PRIVACY');
    console.log(`   ✅ Found ${reqs.length} requirements`);
    
    // Test 2: Questions
    console.log('\n2️⃣  Testing Questions...');
    const questions = await Question.find({});
    const chileQuestions = questions.filter(q => 
      q.questionId?.startsWith('Q-PRIV-') || 
      (q.regulationType === 'CHILEAN_PRIVACY')
    );
    console.log(`   ✅ Found ${chileQuestions.length} questions (out of ${questions.length} total)`);
    
    // Test 3: Controls
    console.log('\n3️⃣  Testing Controls...');
    const controls = await Control.find({});
    const chileControls = controls.filter(c => {
      const pillars = ['LAWFULNESS_FAIRNESS', 'PURPOSE_LIMITATION', 'DATA_MINIMIZATION', 
                       'PROPORTIONALITY', 'QUALITY', 'ACCOUNTABILITY', 'SECURITY', 
                       'TRANSPARENCY_CONFIDENTIALITY'];
      return pillars.includes(c.pillar || '');
    });
    console.log(`   ✅ Found ${chileControls.length} controls (out of ${controls.length} total)`);
    
    // Test 4: Mappings
    console.log('\n4️⃣  Testing Question Mappings...');
    const mappings = await QuestionMapping.find({});
    const chileMappings = mappings.filter(m => 
      m.questionId?.startsWith('Q-PRIV-')
    );
    console.log(`   ✅ Found ${chileMappings.length} mappings (out of ${mappings.length} total)`);
    
    // Test 5: Mappings with requirements
    const mappingsWithReqs = chileMappings.filter(m => 
      m.controlBasedRequirements && m.controlBasedRequirements.length > 0
    );
    console.log(`   ✅ ${mappingsWithReqs.length} mappings have requirements`);
    
    // Test 6: Controls with requirements
    console.log('\n5️⃣  Testing Control-Requirement Mappings...');
    const controlsWithReqs = chileControls.filter(c => 
      c.requirementIds && c.requirementIds.length > 0
    );
    console.log(`   ✅ ${controlsWithReqs.length} controls have requirements mapped`);
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Requirements: ${reqs.length}`);
    console.log(`   Questions: ${chileQuestions.length}`);
    console.log(`   Controls: ${chileControls.length}`);
    console.log(`   Question Mappings: ${chileMappings.length}`);
    console.log(`   Mappings with Requirements: ${mappingsWithReqs.length}`);
    console.log(`   Controls with Requirements: ${controlsWithReqs.length}`);
    
    // Check sample mapping
    if (mappingsWithReqs.length > 0) {
      const sample = mappingsWithReqs[0];
      console.log(`\n📋 Sample Mapping:`);
      console.log(`   Question: ${sample.questionId}`);
      console.log(`   Requirements: ${sample.controlBasedRequirements.length}`);
      console.log(`   Sample Req IDs: ${sample.controlBasedRequirements.slice(0, 3).join(', ')}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

test();
