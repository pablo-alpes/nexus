/**
 * Deduplicate questions - keep only one copy of each questionId
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/local-db');
const QUESTION_FILE = path.join(DATA_DIR, 'Question.json');

function deduplicateQuestions() {
  console.log('🔍 Deduplicating questions...\n');
  
  if (!fs.existsSync(QUESTION_FILE)) {
    console.error('❌ Question.json not found');
    return;
  }
  
  const questions = JSON.parse(fs.readFileSync(QUESTION_FILE, 'utf8'));
  console.log(`Total questions before: ${questions.length}`);
  
  // Group by questionId
  const byQuestionId = {};
  questions.forEach(q => {
    if (!byQuestionId[q.questionId]) {
      byQuestionId[q.questionId] = [];
    }
    byQuestionId[q.questionId].push(q);
  });
  
  // Find duplicates
  const duplicates = Object.entries(byQuestionId).filter(([id, arr]) => arr.length > 1);
  console.log(`Duplicates found: ${duplicates.length} questionIds with multiple copies\n`);
  
  // Keep only the first occurrence of each questionId
  const uniqueQuestions = [];
  const seen = new Set();
  
  questions.forEach(q => {
    if (!seen.has(q.questionId)) {
      seen.add(q.questionId);
      uniqueQuestions.push(q);
    }
  });
  
  console.log(`Total questions after: ${uniqueQuestions.length}`);
  console.log(`Removed: ${questions.length - uniqueQuestions.length} duplicate questions\n`);
  
  // Backup original file (skip if permission denied)
  try {
    const backupFile = QUESTION_FILE + '.backup.' + Date.now();
    fs.copyFileSync(QUESTION_FILE, backupFile);
    console.log(`✅ Backup created: ${backupFile}`);
  } catch (error) {
    console.log(`⚠️  Could not create backup (permission issue), continuing anyway...`);
  }
  
  // Write deduplicated questions
  fs.writeFileSync(QUESTION_FILE, JSON.stringify(uniqueQuestions, null, 2));
  console.log(`✅ Deduplicated questions saved to ${QUESTION_FILE}\n`);
  
  // Report on duplicates
  if (duplicates.length > 0) {
    console.log('📋 Duplicate details:');
    duplicates.forEach(([id, arr]) => {
      console.log(`  ${id}: ${arr.length} copies`);
      arr.forEach((q, i) => {
        console.log(`    ${i+1}. _id: ${q._id}, createdAt: ${q.createdAt}`);
      });
    });
  }
}

deduplicateQuestions();

