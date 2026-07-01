/**
 * Quick verification of DORA compliance engine fixes
 * Run: USE_LOCAL_STORAGE=true npx tsx scripts/verify-dora-engine.ts
 */

import { connectDBLocal } from '../lib/mongodb-local';
import { computeQuestionnaireControlMapping, summarizePillarAnswers } from '../lib/compliance-engine';
import { getQuestionModel } from '../models/Question';
import { RegulationType } from '../lib/regulations';
import { isLocalStorage } from '../lib/mongodb-local';

async function main() {
  await connectDBLocal();
  const QuestionModel = isLocalStorage() ? getQuestionModel(RegulationType.DORA) : getQuestionModel();
  const questions = await QuestionModel.find({});

  console.log(`\n📋 Found ${questions.length} DORA questions\n`);

  // Scenario 1: All Yes
  const allYesAnswers = questions.map((q: any) => ({
    questionId: String(q._id),
    value: 'yes',
  }));

  const allYesMapping = await computeQuestionnaireControlMapping(allYesAnswers, RegulationType.DORA);
  console.log('✅ All Yes scenario:');
  console.log(`   Applicable controls (gaps): ${allYesMapping.applicableControlIds.length}`);

  const ictQuestions = questions.filter((q: any) => q.pillar === 'ICT_RISK_MANAGEMENT');
  const ictSummary = summarizePillarAnswers(ictQuestions, allYesAnswers);
  console.log(`   ICT pillar allYesOrNA: ${ictSummary.allYesOrNA}`);

  // Scenario 2: All No
  const allNoAnswers = questions.map((q: any) => ({
    questionId: String(q._id),
    value: 'no',
  }));

  const allNoMapping = await computeQuestionnaireControlMapping(allNoAnswers, RegulationType.DORA);
  console.log('\n⚠️  All No scenario:');
  console.log(`   Applicable controls (gaps): ${allNoMapping.applicableControlIds.length}`);
  console.log(`   Requirements mapped: ${allNoMapping.requirementsFromNoAnswers.length}`);

  // Scenario 3: Mixed (first half yes, second half no)
  const mixedAnswers = questions.map((q: any, i: number) => ({
    questionId: String(q._id),
    value: i < Math.floor(questions.length / 2) ? 'yes' : 'no',
  }));

  const mixedMapping = await computeQuestionnaireControlMapping(mixedAnswers, RegulationType.DORA);
  console.log('\n📊 Mixed scenario:');
  console.log(`   Applicable controls (gaps): ${mixedMapping.applicableControlIds.length}`);

  if (allYesMapping.applicableControlIds.length === 0 && allNoMapping.applicableControlIds.length > 0) {
    console.log('\n✅ Engine behaving correctly: Yes=0 gaps, No=identifies controls\n');
  } else {
    console.log('\n❌ Unexpected results - check mappings\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
