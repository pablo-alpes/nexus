/**
 * Seed deterministic demo data for DORA + TPRM.
 *
 * Usage:
 *   USE_LOCAL_STORAGE=true npx tsx scripts/seed-demo-data.ts
 */

import fs from 'fs';
import path from 'path';
import { connectDBLocal, isLocalStorage } from '../lib/mongodb-local';
import { ensureQuestionnaireSetup } from '../lib/auto-questionnaire';
import { ensureControlsSetup } from '../lib/auto-controls';
import { RegulationType } from '../lib/regulations';
import { computeQuestionnaireControlMapping, controlMatchesIdSet } from '../lib/compliance-engine';
import { getQuestionModel } from '../models/Question';
import { getControlModel, ControlStatus } from '../models/Control';
import DORARequirement from '../models/DORARequirement';
import Asset from '../models/Asset';
import QuestionnaireResponse from '../models/QuestionnaireResponse';
import ThirdPartyICTProvider, {
  TPRM_DEMO_PROVIDERS,
  calculateTPRMRiskLevel,
  calculateTPRMComplianceStatus,
} from '../models/ThirdPartyICTProvider';

const TEST_USER_ID = 'test-user-123';

type DemoAsset = {
  assetId: string;
  name: string;
  description: string;
  assetType: string;
  criticalityLevel: number;
  owner: string;
  location: string;
};

const DEMO_ASSETS: DemoAsset[] = [
  {
    assetId: 'ASSET-DEMO-001',
    name: 'Core Banking Platform',
    description: 'Primary transaction and account processing platform',
    assetType: 'APPLICATION',
    criticalityLevel: 4,
    owner: 'IT Operations',
    location: 'EU Data Center',
  },
  {
    assetId: 'ASSET-DEMO-002',
    name: 'Payments Database',
    description: 'High-criticality payments and ledger database',
    assetType: 'DATABASE',
    criticalityLevel: 4,
    owner: 'Data Engineering',
    location: 'EU Data Center',
  },
  {
    assetId: 'ASSET-DEMO-003',
    name: 'Customer Web Portal',
    description: 'External customer self-service platform',
    assetType: 'APPLICATION',
    criticalityLevel: 3,
    owner: 'Digital Banking',
    location: 'Cloud',
  },
  {
    assetId: 'ASSET-DEMO-004',
    name: 'Identity Provider',
    description: 'Third-party IAM and SSO provider',
    assetType: 'THIRD_PARTY_SERVICE',
    criticalityLevel: 3,
    owner: 'Security',
    location: 'Cloud',
  },
  {
    assetId: 'ASSET-DEMO-005',
    name: 'Backup Vault',
    description: 'Offline and immutable backup storage',
    assetType: 'DATA_STORAGE',
    criticalityLevel: 2,
    owner: 'Infrastructure',
    location: 'Secondary Region',
  },
  {
    assetId: 'ASSET-DEMO-006',
    name: 'SOC SIEM',
    description: 'Security monitoring and event management',
    assetType: 'SECURITY_TOOL',
    criticalityLevel: 3,
    owner: 'SOC Team',
    location: 'Cloud',
  },
];

function answerForQuestion(questionId: string): 'yes' | 'no' | 'not_applicable' {
  // Deterministic, demo-friendly pattern:
  // mostly compliant with selective gaps.
  if (questionId.includes('Q-TP-')) {
    if (questionId.endsWith('001') || questionId.endsWith('004')) return 'yes';
    return 'no';
  }
  if (questionId.includes('Q-INC-') && (questionId.endsWith('004') || questionId.endsWith('005'))) return 'no';
  if (questionId.includes('Q-TEST-') && questionId.endsWith('003')) return 'no';
  if (questionId.includes('Q-INFO-') && questionId.endsWith('003')) return 'no';
  if (questionId.includes('Q-ICT-') && (questionId.endsWith('004') || questionId.endsWith('006'))) return 'no';
  return 'yes';
}

async function seedRequirementsIfNeeded() {
  const count = await DORARequirement.countDocuments();
  if (count > 0) return;

  const sourcePath = path.join(process.cwd(), 'data', 'dora-requirements-final.json');
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Requirements source not found: ${sourcePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const rows = Array.isArray(raw.requirements) ? raw.requirements : [];
  for (const req of rows) {
    await DORARequirement.findOneAndUpdate(
      { requirementId: req.requirementId },
      {
        requirementId: req.requirementId,
        chapter: req.chapter,
        article: req.article,
        paragraph: req.paragraph,
        title: req.title || req.requirementId,
        description: req.description || '',
        legalText: req.legalText || req.description || '',
        pillar: req.pillar || 'ICT_RISK_MANAGEMENT',
        complianceStatus: req.complianceStatus || 'NOT_APPLICABLE',
        notes: req.notes || null,
        iso27001Mappings: req.iso27001Mappings || [],
      },
      { upsert: true, new: true }
    );
  }
}

async function seedAssets(applicableControls: Set<string>) {
  const ControlModel = getControlModel(RegulationType.DORA);
  const allControls: any[] = await ControlModel.find({});

  for (const item of DEMO_ASSETS) {
    const controls = allControls
      .filter((c) => controlMatchesIdSet(c, applicableControls))
      .filter((c) => {
        if (c.controlType === 'TRANSVERSAL') {
          return !c.minCriticalityLevel || item.criticalityLevel >= c.minCriticalityLevel;
        }
        if (c.controlType === 'SPECIFIC') {
          const typeOk = Array.isArray(c.applicableAssetTypes) && c.applicableAssetTypes.includes(item.assetType);
          const critOk = !c.minCriticalityLevel || item.criticalityLevel >= c.minCriticalityLevel;
          return typeOk && critOk;
        }
        return false;
      });

    await Asset.findOneAndUpdate(
      { assetId: item.assetId, userId: TEST_USER_ID as any },
      {
        ...item,
        userId: TEST_USER_ID as any,
        controls: controls.map((c) => c._id || c.controlId),
      },
      { upsert: true, new: true }
    );
  }
}

async function seedControlCompliance(applicableControls: Set<string>) {
  const ControlModel = getControlModel(RegulationType.DORA);
  const allControls: any[] = await ControlModel.find({});
  const relevant = allControls.filter((c) => controlMatchesIdSet(c, applicableControls));

  const fullyThreshold = Math.floor(relevant.length * 0.35);
  const partialThreshold = Math.floor(relevant.length * 0.55);

  for (let i = 0; i < relevant.length; i++) {
    const c = relevant[i];
    let complianceStatus = 'NOT_COMPLIANT';
    let status = ControlStatus.NOT_IMPLEMENTED;

    if (i < fullyThreshold) {
      complianceStatus = 'FULLY_COMPLIANT';
      status = ControlStatus.FULLY_IMPLEMENTED;
    } else if (i < partialThreshold) {
      complianceStatus = 'PARTIALLY_COMPLIANT';
      status = ControlStatus.PARTIALLY_IMPLEMENTED;
    }

    await ControlModel.findOneAndUpdate(
      { _id: c._id },
      { complianceStatus, status },
      { new: true }
    );
  }
}

async function seedTPRM() {
  for (const provider of TPRM_DEMO_PROVIDERS) {
    await ThirdPartyICTProvider.findOneAndUpdate(
      { providerId: provider.providerId },
      {
        ...provider,
        riskLevel: calculateTPRMRiskLevel(provider),
        complianceStatus: calculateTPRMComplianceStatus(provider),
        lastAssessmentDate: new Date(),
        nextAssessmentDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true }
    );
  }
}

async function main() {
  await connectDBLocal();
  console.log(`📦 Seeding demo data (local storage: ${isLocalStorage()})`);

  await seedRequirementsIfNeeded();
  await ensureQuestionnaireSetup();
  await ensureControlsSetup();

  const QuestionModel = getQuestionModel(RegulationType.DORA);
  const questions: any[] = await QuestionModel.find({});
  if (questions.length === 0) throw new Error('No DORA questions found after setup');

  const answers = questions
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((q) => ({
      questionId: String(q._id),
      value: answerForQuestion(String(q.questionId || '')),
    }));

  const mapping = await computeQuestionnaireControlMapping(answers, RegulationType.DORA);
  const applicableControls = new Set(mapping.applicableControlIds);

  await QuestionnaireResponse.findOneAndUpdate(
    { userId: TEST_USER_ID as any },
    {
      userId: TEST_USER_ID as any,
      answers,
      applicableControls: Array.from(applicableControls),
      controlReasoning: mapping.controlReasoning,
      completedAt: new Date().toISOString(),
    },
    { upsert: true, new: true }
  );

  await seedAssets(applicableControls);
  await seedControlCompliance(applicableControls);
  await seedTPRM();

  console.log(`✅ Demo seed complete`);
  console.log(`   Questions answered: ${answers.length}`);
  console.log(`   Applicable controls: ${applicableControls.size}`);
  console.log(`   Demo assets: ${DEMO_ASSETS.length}`);
  console.log(`   TPRM demo providers: ${TPRM_DEMO_PROVIDERS.length}`);
}

main().catch((err) => {
  console.error('❌ seed-demo-data failed:', err);
  process.exit(1);
});
