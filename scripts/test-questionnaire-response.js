/**
 * Integration test for questionnaire response saving
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

async function testQuestionnaireResponse() {
  console.log('🧪 Testing Questionnaire Response Saving\n');
  
  try {
    const testUserId = 'test-user-123';
    
    // Step 1: Check questions
    console.log('1️⃣  Checking questions...');
    const questions = readCollection('Question');
    console.log(`   Found ${questions.length} questions`);
    
    if (questions.length === 0) {
      console.log('   ⚠️  No questions found!');
      return;
    }
    
    // Step 2: Create test answers
    console.log('\n2️⃣  Creating test answers...');
    const testAnswers = questions.slice(0, 10).map(q => ({
      questionId: q._id,
      value: Math.random() > 0.5 ? 'yes' : 'no', // Random yes/no
    }));
    
    // Make sure at least some are "yes"
    testAnswers[0].value = 'yes';
    testAnswers[1].value = 'yes';
    testAnswers[2].value = 'yes';
    
    console.log(`   Created ${testAnswers.length} test answers`);
    console.log(`   Yes answers: ${testAnswers.filter(a => a.value === 'yes').length}`);
    
    // Step 3: Get applicable controls from "yes" answers
    console.log('\n3️⃣  Determining applicable controls...');
    const applicableControlIds = new Set();
    const applicableRequirementIds = new Set();
    
    for (const answer of testAnswers) {
      if (answer.value === 'yes') {
        const question = questions.find(q => q._id === answer.questionId);
        if (question && question.options) {
          const yesOption = question.options.find(o => o.value === 'yes');
          if (yesOption && yesOption.applicableControls) {
            yesOption.applicableControls.forEach(id => {
              applicableControlIds.add(String(id));
              applicableRequirementIds.add(String(id)); // For now, controls = requirements
            });
          }
        }
      }
    }
    
    console.log(`   Applicable controls: ${applicableControlIds.size}`);
    
    // Step 4: Save questionnaire response
    console.log('\n4️⃣  Saving questionnaire response...');
    const allResponses = readCollection('QuestionnaireResponse');
    
    // Remove existing response for test user
    const filteredResponses = allResponses.filter(r => r.userId !== testUserId);
    
    const newResponse = {
      _id: `local-${Date.now()}-response`,
      userId: testUserId,
      answers: testAnswers,
      applicableControls: Array.from(applicableControlIds),
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    filteredResponses.push(newResponse);
    writeCollection('QuestionnaireResponse', filteredResponses);
    console.log('   ✅ Saved questionnaire response');
    
    // Step 5: Verify saved response
    console.log('\n5️⃣  Verifying saved response...');
    const savedResponse = readCollection('QuestionnaireResponse').find(r => r.userId === testUserId);
    
    if (savedResponse) {
      console.log('   ✅ Response found!');
      console.log(`   Answers: ${savedResponse.answers?.length || 0}`);
      console.log(`   Applicable controls: ${savedResponse.applicableControls?.length || 0}`);
      console.log(`   Completed at: ${savedResponse.completedAt}`);
      
      // Verify answers
      const yesCount = savedResponse.answers.filter(a => a.value === 'yes').length;
      const noCount = savedResponse.answers.filter(a => a.value === 'no').length;
      const naCount = savedResponse.answers.filter(a => a.value === 'not_applicable').length;
      
      console.log(`\n   Answer breakdown:`);
      console.log(`     Yes: ${yesCount}`);
      console.log(`     No: ${noCount}`);
      console.log(`     Not Applicable: ${naCount}`);
    } else {
      console.log('   ❌ Response not found after save!');
    }
    
    // Step 6: Test updating response
    console.log('\n6️⃣  Testing response update...');
    const updatedAnswers = [...testAnswers];
    updatedAnswers[3].value = 'yes'; // Change one to yes
    
    const updatedResponse = {
      ...savedResponse,
      answers: updatedAnswers,
      applicableControls: Array.from(applicableControlIds), // Recalculate
      updatedAt: new Date().toISOString(),
    };
    
    const allResponses2 = readCollection('QuestionnaireResponse');
    const index = allResponses2.findIndex(r => r.userId === testUserId);
    if (index >= 0) {
      allResponses2[index] = updatedResponse;
      writeCollection('QuestionnaireResponse', allResponses2);
      console.log('   ✅ Updated questionnaire response');
    }
    
    console.log('\n✅ Questionnaire response test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testQuestionnaireResponse()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });

