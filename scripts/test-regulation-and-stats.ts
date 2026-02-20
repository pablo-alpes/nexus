/**
 * Regulation separation and statistics tests
 *
 * Verifies:
 * 1. Questions, mappings, requirements, and controls are separated by regulation
 *    (DORA vs CHILEAN_PRIVACY) and each API returns only the requested regulation's data.
 * 2. Statistics (mapping counts, pillar counts) are correct per regulation.
 * 3. Remediation plan can be generated for each regulation with correct pillars and data.
 * 4. All-No questionnaire → gap analysis: with all answers set to "no", submitting the
 *    questionnaire yields a non-zero number of applicable controls, and running gap analysis
 *    produces at least that many gaps (central flow for compliance).
 *
 * Run: USE_LOCAL_STORAGE=true tsx scripts/test-regulation-and-stats.ts
 * Or: npm run test:regulation-and-stats
 * Or with temp dir: TEST_LOCAL_DB_PATH=/tmp/nexus-test-xyz tsx scripts/test-regulation-and-stats.ts
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const DORA_PILLARS = [
  'ICT_RISK_MANAGEMENT',
  'INCIDENT_MANAGEMENT',
  'RESILIENCE_TESTING',
  'THIRD_PARTY_RISK',
  'INFORMATION_SHARING',
];
const CHILEAN_PILLARS = [
  'ACCOUNTABILITY',
  'SECURITY',
  'TRANSPARENCY_CONFIDENTIALITY',
  'LAWFULNESS_FAIRNESS',
  'PURPOSE_LIMITATION',
  'DATA_MINIMIZATION',
  'QUALITY',
  'PROPORTIONALITY',
];

let testDataDir: string;
let originalCwd: string;
let failures: string[] = [];
let testsRun = 0;

function assert(condition: boolean, message: string) {
  testsRun++;
  if (!condition) {
    failures.push(message);
    console.error(`  ❌ ${message}`);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  testsRun++;
  const ok = actual === expected;
  if (!ok) {
    const msg = `${message} (expected ${expected}, got ${actual})`;
    failures.push(msg);
    console.error(`  ❌ ${msg}`);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

function assertArrayContainsOnly<T>(arr: T[], allowed: T[], message: string, stringify?: (t: T) => string) {
  testsRun++;
  const bad = arr.filter((x) => !allowed.includes(x));
  const ok = bad.length === 0;
  if (!ok) {
    const msg = `${message} (unexpected: ${(stringify ? bad.map(stringify) : bad).join(', ')})`;
    failures.push(msg);
    console.error(`  ❌ ${msg}`);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function runTests() {
  console.log('\n=== Regulation separation and statistics tests ===\n');

  const useTempDir = !process.env.TEST_LOCAL_DB_PATH;
  if (useTempDir) {
    testDataDir = path.join(os.tmpdir(), `nexus-test-${Date.now()}`);
  } else {
    testDataDir = path.resolve(process.env.TEST_LOCAL_DB_PATH);
  }
  const dataDir = useTempDir ? path.join(testDataDir, 'data', 'local-db') : testDataDir;
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.USE_LOCAL_STORAGE = 'true';
  process.env.TEST_LOCAL_DB_PATH = dataDir;
  process.env.TEST_MODE = 'true'; // so getAuthUser returns test user for controls/remediation
  originalCwd = process.cwd();

  // Seed regulation-scoped data
  const base = path.join(dataDir);

  writeJson(path.join(base, 'Question_DORA.json'), [
    {
      _id: 'local-q-dora-1',
      questionId: 'Q-ICT-001',
      text: 'Do you have an ICT risk management framework?',
      type: 'YES_NO',
      pillar: 'ICT_RISK_MANAGEMENT',
      order: 1,
      isRequired: true,
      regulationType: 'DORA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  writeJson(path.join(base, 'Question_CHILEAN_PRIVACY.json'), [
    {
      _id: 'local-q-chile-1',
      questionId: 'Q-PRIV-A-001',
      text: 'Protección de datos personales - accountability',
      type: 'YES_NO',
      pillar: 'ACCOUNTABILITY',
      order: 1,
      isRequired: true,
      regulationType: 'CHILEAN_PRIVACY',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  // DORA mapping version must match getCurrentRuleVersion(DORA) – set after chdir below
  const questionMappingDoraPath = path.join(base, 'QuestionMapping_DORA.json');

  writeJson(path.join(base, 'QuestionMapping_CHILEAN_PRIVACY.json'), [
    {
      _id: 'local-m-chile-1',
      questionId: 'Q-PRIV-A-001',
      ruleVersion: '2.0',
      controlBasedRequirements: ['CHILE-REQ-1'],
      coherenceMetrics: { averageRelevance: 0.85, highConfidenceCount: 1, mediumConfidenceCount: 0, lowConfidenceCount: 0, overallCoherence: 100 },
      computedAt: new Date().toISOString(),
      version: '2.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  writeJson(path.join(base, 'DORARequirement_DORA.json'), [
    {
      _id: 'local-r-dora-1',
      requirementId: 'DORA-REQ-1',
      pillar: 'ICT_RISK_MANAGEMENT',
      title: 'ICT risk framework',
      description: 'Requirement for ICT risk',
      legalText: 'Legal text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  writeJson(path.join(base, 'Requirement_CHILEAN_PRIVACY.json'), [
    {
      _id: 'local-r-chile-1',
      requirementId: 'CHILE-REQ-1',
      regulationType: 'CHILEAN_PRIVACY',
      pillar: 'ACCOUNTABILITY',
      title: 'Accountability principle',
      description: 'Data controller accountability',
      legalText: 'Legal text',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  writeJson(path.join(base, 'Control_DORA.json'), [
    {
      _id: 'local-c-dora-1',
      controlId: 'CTRL-D-1',
      pillar: 'ICT_RISK_MANAGEMENT',
      title: 'ICT control',
      description: 'Control for ICT risk',
      requirementIds: ['local-r-dora-1'],
      controlType: 'TRANSVERSAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  writeJson(path.join(base, 'Control_CHILEAN_PRIVACY.json'), [
    {
      _id: 'local-c-chile-1',
      controlId: 'CTRL-P-1',
      pillar: 'ACCOUNTABILITY',
      title: 'Privacy accountability control',
      description: 'Control for accountability',
      requirementIds: ['local-r-chile-1'],
      controlType: 'TRANSVERSAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  writeJson(path.join(base, 'RuleVersion.json'), [
    { _id: 'rv1', version: '1.0', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'rv2', version: '2.0', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]);

  const nexusRoot = path.resolve(__dirname, '..');
  process.chdir(nexusRoot);

  const { getCurrentRuleVersion } = await import('../lib/services/precomputed-mappings');
  const { RegulationType: RegType } = await import('../lib/regulations');
  const doraRuleVersion = getCurrentRuleVersion(RegType.DORA);
  writeJson(questionMappingDoraPath, [
    {
      _id: 'local-m-dora-1',
      questionId: 'Q-ICT-001',
      ruleVersion: doraRuleVersion,
      controlBasedRequirements: ['DORA-REQ-1'],
      coherenceMetrics: { averageRelevance: 0.9, highConfidenceCount: 1, mediumConfidenceCount: 0, lowConfidenceCount: 0, overallCoherence: 100 },
      computedAt: new Date().toISOString(),
      version: doraRuleVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  try {
    const { NextRequest } = await import('next/server');

    // --- 1. Questions API: each regulation returns only its questions ---
    console.log('\n1. Questions API – regulation separation');
    const questionsGet = (await import('../app/api/questionnaire/questions/route')).GET;
    const reqDora = new NextRequest(`http://localhost/api/questionnaire/questions?regulation=DORA`);
    const reqChile = new NextRequest(`http://localhost/api/questionnaire/questions?regulation=CHILEAN_PRIVACY`);

    const resDora = await questionsGet(reqDora);
    const resChile = await questionsGet(reqChile);
    const bodyDora = await resDora.json();
    const bodyChile = await resChile.json();

    assert(resDora.status === 200, 'DORA questions API returns 200');
    assert(resChile.status === 200, 'Chilean Privacy questions API returns 200');
    assert(Array.isArray(bodyDora.questions), 'DORA response has questions array');
    assert(Array.isArray(bodyChile.questions), 'Chilean response has questions array');

    const doraPillars = (bodyDora.questions as { pillar?: string }[]).map((q) => q.pillar).filter(Boolean);
    const chilePillars = (bodyChile.questions as { pillar?: string }[]).map((q) => q.pillar).filter(Boolean);
    assertArrayContainsOnly(doraPillars, DORA_PILLARS, 'DORA questions have only DORA pillars', (p) => p!);
    assertArrayContainsOnly(chilePillars, CHILEAN_PILLARS, 'Chilean questions have only Chilean pillars', (p) => p!);

    const doraQuestionIds = (bodyDora.questions as { questionId?: string }[]).map((q) => q.questionId);
    const chileQuestionIds = (bodyChile.questions as { questionId?: string }[]).map((q) => q.questionId);
    assert(doraQuestionIds.every((id: string) => !id.startsWith('Q-PRIV-')), 'DORA questions do not include Q-PRIV-*');
    assert(chileQuestionIds.every((id: string) => id.startsWith('Q-PRIV-')), 'Chilean questions are all Q-PRIV-*');

    assertEqual(bodyDora.questions.length, 1, 'DORA returns exactly 1 question (seeded)');
    assertEqual(bodyChile.questions.length, 1, 'Chilean returns exactly 1 question (seeded)');

    // --- 2. Mappings API: each regulation returns only its mappings ---
    console.log('\n2. Mappings API – regulation separation');
    const mappingsGet = (await import('../app/api/rule-version/mappings/route')).GET;
    const mapReqDora = new NextRequest(`http://localhost/api/rule-version/mappings?regulation=DORA`);
    const mapReqChile = new NextRequest(`http://localhost/api/rule-version/mappings?regulation=CHILEAN_PRIVACY`);

    const mapResDora = await mappingsGet(mapReqDora);
    const mapResChile = await mappingsGet(mapReqChile);
    const mapBodyDora = await mapResDora.json();
    const mapBodyChile = await mapResChile.json();

    assert(mapResDora.status === 200, 'DORA mappings API returns 200');
    assert(mapResChile.status === 200, 'Chilean mappings API returns 200');
    assert(Array.isArray(mapBodyDora.mappings), 'DORA response has mappings array');
    assert(Array.isArray(mapBodyChile.mappings), 'Chilean response has mappings array');

    const doraMappingIds = (mapBodyDora.mappings as { questionId: string }[]).map((m) => m.questionId);
    const chileMappingIds = (mapBodyChile.mappings as { questionId: string }[]).map((m) => m.questionId);
    assert(doraMappingIds.every((id: string) => !id.startsWith('Q-PRIV-')), 'DORA mappings do not include Q-PRIV-*');
    assert(chileMappingIds.every((id: string) => id.startsWith('Q-PRIV-')), 'Chilean mappings are all Q-PRIV-*');

    assert(mapBodyDora.mappings.length >= 1, 'DORA returns at least 1 mapping (seeded for current rule version)');
    assertEqual(mapBodyChile.mappings.length, 1, 'Chilean returns exactly 1 mapping');
    assertEqual(mapBodyDora.ruleVersion, doraRuleVersion, 'DORA rule version matches getCurrentRuleVersion(DORA)');
    assertEqual(mapBodyChile.ruleVersion, '2.0', 'Chilean rule version is 2.0');

    // --- 3. Requirements API: each regulation returns only its requirements ---
    console.log('\n3. Requirements API – regulation separation');
    const reqsGet = (await import('../app/api/requirements/route')).GET;
    const reqsReqDora = new NextRequest(`http://localhost/api/requirements?regulation=DORA`);
    const reqsReqChile = new NextRequest(`http://localhost/api/requirements?regulation=CHILEAN_PRIVACY`);

    const reqsResDora = await reqsGet(reqsReqDora);
    const reqsResChile = await reqsGet(reqsReqChile);
    const reqsBodyDora = await reqsResDora.json();
    const reqsBodyChile = await reqsResChile.json();

    assert(reqsResDora.status === 200, 'DORA requirements API returns 200');
    assert(reqsResChile.status === 200, 'Chilean requirements API returns 200');
    assert(Array.isArray(reqsBodyDora.requirements), 'DORA response has requirements array');
    assert(Array.isArray(reqsBodyChile.requirements), 'Chilean response has requirements array');

    const doraReqs = reqsBodyDora.requirements as { requirementId?: string; pillar?: string }[];
    const chileReqs = reqsBodyChile.requirements as { requirementId?: string; pillar?: string }[];
    assert(doraReqs.every((r) => !r.requirementId?.startsWith('CHILE-')), 'DORA requirements do not include CHILE-*');
    assert(chileReqs.every((r) => r.requirementId?.startsWith('CHILE-') || r.regulationType === 'CHILEAN_PRIVACY'), 'Chilean requirements are Chilean');
    assertArrayContainsOnly(doraReqs.map((r) => r.pillar).filter(Boolean), DORA_PILLARS, 'DORA requirements have only DORA pillars', (p) => p!);
    assertArrayContainsOnly(chileReqs.map((r) => r.pillar).filter(Boolean), CHILEAN_PILLARS, 'Chilean requirements have only Chilean pillars', (p) => p!);

    // --- 4. Controls API: each regulation returns only its controls ---
    console.log('\n4. Controls API – regulation separation');
    const controlsGet = (await import('../app/api/controls/route')).GET;
    const ctrlReqDora = new NextRequest(`http://localhost/api/controls?regulation=DORA`);
    const ctrlReqChile = new NextRequest(`http://localhost/api/controls?regulation=CHILEAN_PRIVACY`);

    const ctrlResDora = await controlsGet(ctrlReqDora);
    const ctrlResChile = await controlsGet(ctrlReqChile);
    const ctrlBodyDora = await ctrlResDora.json();
    const ctrlBodyChile = await ctrlResChile.json();

    assert(ctrlResDora.status === 200, 'DORA controls API returns 200');
    assert(ctrlResChile.status === 200, 'Chilean controls API returns 200');
    assert(Array.isArray(ctrlBodyDora.controls), 'DORA response has controls array');
    assert(Array.isArray(ctrlBodyChile.controls), 'Chilean response has controls array');

    const doraCtrlPillars = (ctrlBodyDora.controls as { pillar?: string }[]).map((c) => c.pillar).filter(Boolean);
    const chileCtrlPillars = (ctrlBodyChile.controls as { pillar?: string }[]).map((c) => c.pillar).filter(Boolean);
    assertArrayContainsOnly(doraCtrlPillars, DORA_PILLARS, 'DORA controls have only DORA pillars', (p) => p!);
    assertArrayContainsOnly(chileCtrlPillars, CHILEAN_PILLARS, 'Chilean controls have only Chilean pillars', (p) => p!);

    assertEqual(ctrlBodyDora.controls.length, 1, 'DORA returns exactly 1 control');
    assertEqual(ctrlBodyChile.controls.length, 1, 'Chilean returns exactly 1 control');

    // --- 5. Statistics: mapping completeness is per-regulation ---
    console.log('\n5. Statistics – mapping counts are per regulation');
    const totalMappingsDora = mapBodyDora.mappings.length;
    const totalQuestionsDora = bodyDora.questions.length;
    const totalMappingsChile = mapBodyChile.mappings.length;
    const totalQuestionsChile = bodyChile.questions.length;
    assert(totalMappingsDora <= totalQuestionsDora, 'DORA mapping count does not exceed question count');
    assert(totalMappingsChile <= totalQuestionsChile, 'Chilean mapping count does not exceed question count');
    assert(totalQuestionsDora === 1 && totalQuestionsChile === 1, 'Each regulation has its own question set (no mixing)');

    // --- 6. Remediation plan: can be generated for each regulation ---
    console.log('\n6. Remediation plan – generation per regulation');
    const remediationPost = (await import('../app/api/remediation/route')).POST;

    const testUserId = (await import('../lib/test-mode')).getTestUser().userId;
    writeJson(path.join(base, 'GapAnalysis.json'), [
      {
        _id: 'ga-dora',
        userId: testUserId,
        regulationType: 'DORA',
        pillar: 'ICT_RISK_MANAGEMENT',
        totalControls: 1,
        implementedControls: 0,
        compliancePercentage: 0,
        gaps: [
          {
            controlId: 'local-c-dora-1',
            status: 'NOT_IMPLEMENTED',
            gapDescription: 'ICT control not implemented',
            priority: 'HIGH',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'ga-chile',
        userId: testUserId,
        regulationType: 'CHILEAN_PRIVACY',
        pillar: 'ACCOUNTABILITY',
        totalControls: 1,
        implementedControls: 0,
        compliancePercentage: 0,
        gaps: [
          {
            controlId: 'local-c-chile-1',
            status: 'NOT_IMPLEMENTED',
            gapDescription: 'Privacy control not implemented',
            priority: 'HIGH',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    writeJson(path.join(base, 'Asset.json'), [
      {
        _id: 'asset-1',
        userId: testUserId,
        name: 'Test Asset',
        criticalityLevel: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // getAuthUser already returns test user when TEST_MODE=true

    const remReqDora = new NextRequest('http://localhost/api/remediation', {
        method: 'POST',
        body: JSON.stringify({ pillar: 'ICT_RISK_MANAGEMENT', regulation: 'DORA' }),
      });
      const remReqChile = new NextRequest('http://localhost/api/remediation', {
        method: 'POST',
        body: JSON.stringify({ pillar: 'ACCOUNTABILITY', regulation: 'CHILEAN_PRIVACY' }),
      });

      const remResDora = await remediationPost(remReqDora);
      const remResChile = await remediationPost(remReqChile);
      const remBodyDora = await remResDora.json();
      const remBodyChile = await remResChile.json();

      assert(remResDora.status === 200, 'DORA remediation plan returns 200');
      assert(remResChile.status === 200, 'Chilean remediation plan returns 200');
      assert(remBodyDora.remediationPlan != null, 'DORA response has remediation plan');
      assert(remBodyChile.remediationPlan != null, 'Chilean response has remediation plan');
      assertEqual(remBodyDora.remediationPlan?.regulationType, 'DORA', 'DORA plan has regulationType DORA');
      assertEqual(remBodyChile.remediationPlan?.regulationType, 'CHILEAN_PRIVACY', 'Chilean plan has regulationType CHILEAN_PRIVACY');
      assertEqual(remBodyDora.remediationPlan?.pillar, 'ICT_RISK_MANAGEMENT', 'DORA plan pillar is ICT_RISK_MANAGEMENT');
      assertEqual(remBodyChile.remediationPlan?.pillar, 'ACCOUNTABILITY', 'Chilean plan pillar is ACCOUNTABILITY');
    assert(Array.isArray(remBodyDora.tableData) && remBodyDora.tableData.length >= 0, 'DORA plan has tableData');
    assert(Array.isArray(remBodyChile.tableData) && remBodyChile.tableData.length >= 0, 'Chilean plan has tableData');

    // --- 7. All-No questionnaire → gap analysis yields expected volume of gaps (central flow) ---
    console.log('\n7. All-No questionnaire → gap analysis produces gaps');
    const questionnairePost = (await import('../app/api/questionnaire/response/route')).POST;
    const gapAnalysisPost = (await import('../app/api/gap-analysis/route')).POST;

    const doraQuestions = bodyDora.questions as { _id: string; questionId: string; pillar?: string }[];
    const answersAllNo = doraQuestions.map((q) => ({
      questionId: q._id || q.questionId,
      value: 'no',
    }));
    const minExpectedGaps = 1;

    const qReq = new NextRequest('http://localhost/api/questionnaire/response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answersAllNo, regulation: 'DORA' }),
    });
    const qRes = await questionnairePost(qReq);
    const qResBody = await qRes.json();

    if (qRes.status !== 200) {
      failures.push(`Questionnaire response (all no) returns 200 (got ${qRes.status}: ${qResBody?.error || JSON.stringify(qResBody)})`);
      testsRun++;
      console.error(`  ❌ Questionnaire response (all no) returns 200 (got ${qRes.status}: ${qResBody?.error || JSON.stringify(qResBody)})`);
    } else {
      testsRun++;
      console.log(`  ✅ Questionnaire response (all no) returns 200`);
    }
    const applicableCount = qResBody.applicableControlsCount ?? qResBody.response?.applicableControls?.length ?? 0;
    assert(
      applicableCount >= minExpectedGaps,
      `With all answers "no", applicable controls >= ${minExpectedGaps} (got ${applicableCount})`
    );

    const gapReq = new NextRequest('http://localhost/api/gap-analysis', {
      method: 'POST',
      body: JSON.stringify({ pillar: 'ICT_RISK_MANAGEMENT', regulation: 'DORA' }),
    });
    const gapRes = await gapAnalysisPost(gapReq);
    const gapResBody = await gapRes.json();

    assert(gapRes.status === 200, 'Gap analysis POST returns 200');
    assert(gapResBody.gapAnalysis != null, 'Gap analysis response has gapAnalysis');
    assert(
      (gapResBody.summary?.applicableControls ?? 0) >= minExpectedGaps,
      `Gap analysis summary has applicableControls >= ${minExpectedGaps} (got ${gapResBody.summary?.applicableControls})`
    );
    const gapsCount = gapResBody.gapAnalysis?.gaps?.length ?? gapResBody.summary?.gaps ?? 0;
    assert(
      gapsCount >= minExpectedGaps,
      `With all "no" answers, gap analysis yields >= ${minExpectedGaps} gaps (got ${gapsCount})`
    );

  } finally {
    process.chdir(originalCwd);
    if (useTempDir) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Tests run: ${testsRun}`);
  if (failures.length > 0) {
    console.error(`Failures: ${failures.length}\n${failures.join('\n')}`);
    process.exit(1);
  }
  console.log('All tests passed.\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
