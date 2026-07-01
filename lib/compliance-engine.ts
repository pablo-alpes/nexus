/**
 * Shared DORA compliance engine — question → requirement → control mapping
 * and gap-analysis control resolution.
 */

import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import Control, { getControlModel } from '@/models/Control';
import Question, { getQuestionModel } from '@/models/Question';
import { RequirementOperations } from '@/lib/model-operations';
import { getPrecomputedMappings, getActiveRuleVersion } from '@/lib/services/precomputed-mappings';
import { RegulationType, getRegulationConfig } from '@/lib/regulations';
import { ControlStatus } from '@/models/Control';

export interface QuestionAnswer {
  questionId: string;
  value: string;
  textValue?: string;
}

export interface PillarAnswerSummary {
  hasNoAnswers: boolean;
  hasYesAnswers: boolean;
  allYesOrNA: boolean;
  noAnswerQuestionIds: string[];
  yesAnswerQuestionIds: string[];
}

export interface ComputedControlMapping {
  applicableControlIds: string[];
  controlReasoning: Record<string, string[]>;
  requirementsFromNoAnswers: string[];
  requirementsFromYesAnswers: string[];
}

/** Match a control against a set of stored IDs (_id or controlId). */
export function controlMatchesIdSet(control: any, idSet: Set<string>): boolean {
  const candidates = [
    String(control._id || ''),
    String(control.controlId || ''),
  ].filter(Boolean);
  return candidates.some((id) => idSet.has(id));
}

/** Build a lookup set that includes both _id and controlId for each control. */
export function buildControlLookupIds(controls: any[]): Set<string> {
  const ids = new Set<string>();
  for (const control of controls) {
    if (control._id) ids.add(String(control._id));
    if (control.controlId) ids.add(String(control.controlId));
  }
  return ids;
}

/** Summarize questionnaire answers for a specific pillar. */
export function summarizePillarAnswers(
  questionsForPillar: any[],
  answers: QuestionAnswer[]
): PillarAnswerSummary {
  const questionIdToValue = new Map<string, string>();
  for (const q of questionsForPillar) {
    questionIdToValue.set(String(q._id), '');
    if (q.questionId) questionIdToValue.set(String(q.questionId), '');
  }

  const answerByQuestion = new Map<string, string>();
  for (const answer of answers) {
    answerByQuestion.set(String(answer.questionId), answer.value);
  }

  const noAnswerQuestionIds: string[] = [];
  const yesAnswerQuestionIds: string[] = [];
  let answeredCount = 0;

  for (const q of questionsForPillar) {
    const qIds = [String(q._id), q.questionId ? String(q.questionId) : ''].filter(Boolean);
    let value: string | undefined;
    for (const qId of qIds) {
      if (answerByQuestion.has(qId)) {
        value = answerByQuestion.get(qId);
        break;
      }
    }
    if (!value) continue;
    answeredCount++;
    if (value === 'no') noAnswerQuestionIds.push(String(q._id));
    if (value === 'yes') yesAnswerQuestionIds.push(String(q._id));
  }

  const hasNoAnswers = noAnswerQuestionIds.length > 0;
  const hasYesAnswers = yesAnswerQuestionIds.length > 0;
  const allYesOrNA =
    answeredCount > 0 &&
    questionsForPillar.every((q) => {
      const qIds = [String(q._id), q.questionId ? String(q.questionId) : ''].filter(Boolean);
      for (const qId of qIds) {
        const v = answerByQuestion.get(qId);
        if (v) return v === 'yes' || v === 'not_applicable';
      }
      return true;
    });

  return { hasNoAnswers, hasYesAnswers, allYesOrNA, noAnswerQuestionIds, yesAnswerQuestionIds };
}

/** Resolve requirement IDs from precomputed mappings or keyword fallback (same pillar only). */
async function resolveRequirementsForQuestion(
  question: any,
  answerValue: 'yes' | 'no',
  regulationType: RegulationType,
  ruleVersion: string
): Promise<string[]> {
  const reqIds = new Set<string>();
  const precomputed = await getPrecomputedMappings(question.questionId, ruleVersion, regulationType);

  if (precomputed && precomputed.controlBasedRequirements.length > 0) {
    precomputed.controlBasedRequirements.forEach((reqId: string) => reqIds.add(reqId));
    if (answerValue === 'no') {
      const nlpSim = precomputed.nlpSimilarities ?? [];
      nlpSim
        .filter(
          (s: { isControlBased?: boolean; confidence?: string; similarity?: number }) =>
            !s.isControlBased && s.confidence === 'high' && (s.similarity ?? 0) >= 0.75
        )
        .forEach((s) => reqIds.add(s.requirementId));
    }
  } else {
    const allRequirements = await RequirementOperations.findByRegulation(regulationType, {
      pillar: question.pillar,
    });
    const questionKeywords =
      question.text?.toLowerCase().split(' ').filter((w: string) => w.length > 3) || [];
    allRequirements
      .filter((req: any) => {
        const reqText = `${req.description || ''} ${req.title || ''}`.toLowerCase();
        return questionKeywords.some((keyword: string) => reqText.includes(keyword));
      })
      .forEach((req: any) => reqIds.add(String(req.requirementId || req._id)));
  }

  return Array.from(reqIds);
}

/** Normalize requirement IDs to canonical requirementId strings and local _ids. */
async function normalizeRequirementIds(
  requirementIds: string[],
  regulationType: RegulationType
): Promise<{ normalizedSet: Set<string>; reqIdMap: Map<string, string> }> {
  const normalizedSet = new Set<string>();
  const reqIdMap = new Map<string, string>();

  const allReqs = await RequirementOperations.findByRegulation(regulationType, {});

  for (const reqId of requirementIds) {
    normalizedSet.add(reqId);
    const req = allReqs.find(
      (r: any) => String(r._id) === reqId || r.requirementId === reqId
    );
    if (req) {
      const reqIdStr = String(req._id);
      const reqRequirementId = req.requirementId || '';
      normalizedSet.add(reqIdStr);
      if (reqRequirementId) {
        normalizedSet.add(reqRequirementId);
        reqIdMap.set(reqIdStr, reqRequirementId);
        reqIdMap.set(reqRequirementId, reqRequirementId);
        reqIdMap.set(reqId, reqRequirementId);
      }
    }
  }

  return { normalizedSet, reqIdMap };
}

/** Find controls matching requirement IDs within specific pillars. */
async function findControlsForRequirements(
  requirementIds: string[],
  pillars: Set<string>,
  regulationType: RegulationType
): Promise<any[]> {
  if (requirementIds.length === 0) return [];

  const { normalizedSet } = await normalizeRequirementIds(requirementIds, regulationType);
  const ControlModel = isLocalStorage() ? getControlModel(regulationType) : Control;

  const allControls: any[] = [];
  for (const pillar of pillars) {
    const pillarControls = await ControlModel.find({ pillar });
    allControls.push(...pillarControls);
  }

  return allControls.filter((control) => {
    if (!control.requirementIds?.length) return false;
    return control.requirementIds.some((controlReqId: any) => {
      const controlReqIdStr = String(controlReqId);
      return normalizedSet.has(controlReqIdStr);
    });
  });
}

/**
 * Compute applicable controls from questionnaire answers.
 * "No" answers surface gaps; "Yes" answers confirm capability (excluded from gaps).
 */
export async function computeQuestionnaireControlMapping(
  answers: QuestionAnswer[],
  regulationType: RegulationType = RegulationType.DORA
): Promise<ComputedControlMapping> {
  await connectDBLocal();

  const QuestionModel = isLocalStorage() ? getQuestionModel(regulationType) : Question;
  const ruleVersion = await getActiveRuleVersion(regulationType);

  const applicableControlIds = new Set<string>();
  const controlReasoning: Record<string, string[]> = {};
  const requirementsFromNoAnswers = new Set<string>();
  const requirementsFromYesAnswers = new Set<string>();

  const noAnswers: Array<{ question: any; answer: QuestionAnswer }> = [];
  const yesAnswers: Array<{ question: any; answer: QuestionAnswer }> = [];

  for (const answer of answers) {
    let question = await QuestionModel.findOne({ _id: answer.questionId });
    if (!question) {
      question = await QuestionModel.findOne({ questionId: answer.questionId });
    }
    if (!question) continue;

    if (answer.value === 'no') noAnswers.push({ question, answer });
    else if (answer.value === 'yes') yesAnswers.push({ question, answer });
  }

  for (const { question } of noAnswers) {
    const reqIds = await resolveRequirementsForQuestion(question, 'no', regulationType, ruleVersion);
    reqIds.forEach((id) => requirementsFromNoAnswers.add(id));
  }

  for (const { question } of yesAnswers) {
    const reqIds = await resolveRequirementsForQuestion(question, 'yes', regulationType, ruleVersion);
    reqIds.forEach((id) => requirementsFromYesAnswers.add(id));
  }

  const pillarsFromNoAnswers = new Set(
    noAnswers.map(({ question }) => question.pillar).filter(Boolean)
  );

  if (requirementsFromNoAnswers.size > 0) {
    const matchingControls = await findControlsForRequirements(
      Array.from(requirementsFromNoAnswers),
      pillarsFromNoAnswers,
      regulationType
    );

    for (const control of matchingControls) {
      const controlId = String(control._id || control.controlId);
      applicableControlIds.add(controlId);
      if (control.controlId) applicableControlIds.add(String(control.controlId));

      const questionTexts = noAnswers
        .filter(({ question }) => question.pillar === control.pillar)
        .map(({ question }) => question.text)
        .slice(0, 2);

      if (!controlReasoning[controlId]) controlReasoning[controlId] = [];
      controlReasoning[controlId].push(
        `Gap identified: Answered "No" to "${questionTexts.join('", "')}" → Control ${control.controlId || controlId}`
      );
    }
  }

  // Prudence: include controls for requirements appearing in both yes and no answers
  const conflictingRequirements = Array.from(requirementsFromNoAnswers).filter((reqId) =>
    requirementsFromYesAnswers.has(reqId)
  );

  if (conflictingRequirements.length > 0) {
    const conflictingControls = await findControlsForRequirements(
      conflictingRequirements,
      pillarsFromNoAnswers,
      regulationType
    );
    for (const control of conflictingControls) {
      const controlId = String(control._id || control.controlId);
      applicableControlIds.add(controlId);
      if (control.controlId) applicableControlIds.add(String(control.controlId));
      if (!controlReasoning[controlId]) controlReasoning[controlId] = [];
      controlReasoning[controlId].push(
        `Included via prudence: Requirement appears in both Yes and No answers → Control ${control.controlId || controlId}`
      );
    }
  }

  return {
    applicableControlIds: Array.from(applicableControlIds),
    controlReasoning,
    requirementsFromNoAnswers: Array.from(requirementsFromNoAnswers),
    requirementsFromYesAnswers: Array.from(requirementsFromYesAnswers),
  };
}

/** Filter applicable control IDs to those belonging to a specific pillar. */
export function filterApplicableControlsForPillar(
  allControlsForPillar: any[],
  applicableControlIds: Set<string>
): any[] {
  return allControlsForPillar.filter((control) => controlMatchesIdSet(control, applicableControlIds));
}

/** Determine control implementation status considering assets and questionnaire attestation. */
export function evaluateControlStatus(
  control: any,
  applicableAssets: any[],
  options?: { questionnaireAttested?: boolean }
): { status: ControlStatus; gapDescription: string; implementedWeight: number } {
  if (applicableAssets.length === 0) {
    return {
      status: ControlStatus.NOT_APPLICABLE,
      gapDescription: 'No applicable assets found for this control',
      implementedWeight: 0,
    };
  }

  if (options?.questionnaireAttested) {
    return {
      status: ControlStatus.FULLY_IMPLEMENTED,
      gapDescription: `Attested via questionnaire for ${applicableAssets.length} asset(s)`,
      implementedWeight: 1,
    };
  }

  if (control.complianceStatus === 'FULLY_COMPLIANT' || control.status === ControlStatus.FULLY_IMPLEMENTED) {
    return {
      status: ControlStatus.FULLY_IMPLEMENTED,
      gapDescription: `Fully implemented for ${applicableAssets.length} asset(s)`,
      implementedWeight: 1,
    };
  }

  if (
    control.complianceStatus === 'PARTIALLY_COMPLIANT' ||
    control.status === ControlStatus.PARTIALLY_IMPLEMENTED
  ) {
    return {
      status: ControlStatus.PARTIALLY_IMPLEMENTED,
      gapDescription: `Partially implemented for ${applicableAssets.length} asset(s)`,
      implementedWeight: 0.5,
    };
  }

  return {
    status: ControlStatus.NOT_IMPLEMENTED,
    gapDescription: `Not implemented for ${applicableAssets.length} asset(s)`,
    implementedWeight: 0,
  };
}

/** Get pillar IDs for a regulation. */
export function getPillarIds(regulationType: RegulationType): string[] {
  return getRegulationConfig(regulationType).pillars.map((p) => p.id);
}

/** Calculate compliance percentage from gap results. */
export function calculateCompliancePercentage(
  gaps: Array<{ status: ControlStatus }>,
  pillarSummary: PillarAnswerSummary,
  hasQuestionnaire: boolean
): number {
  if (!hasQuestionnaire) return 0;

  if (gaps.length === 0 && pillarSummary.allYesOrNA) return 100;
  if (gaps.length === 0 && !pillarSummary.hasNoAnswers) return 100;

  const applicableGaps = gaps.filter((g) => g.status !== ControlStatus.NOT_APPLICABLE);
  if (applicableGaps.length === 0) {
    return pillarSummary.hasNoAnswers ? 0 : 100;
  }

  const totalWeight = applicableGaps.reduce((sum, g) => {
    if (g.status === ControlStatus.FULLY_IMPLEMENTED) return sum + 1;
    if (g.status === ControlStatus.PARTIALLY_IMPLEMENTED) return sum + 0.5;
    return sum;
  }, 0);

  return Math.round((totalWeight / applicableGaps.length) * 100);
}
