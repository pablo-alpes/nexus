/**
 * Rule Engine Service
 * Processes DORA requirements and maps them to controls based on business logic
 */

import Control, { ControlType } from '@/models/Control';
import Asset from '@/models/Asset';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import { DORAPillar } from '@/models/DORARequirement';

export interface RuleEngineResult {
  applicableControls: string[];
  reasoning: string[];
}

/**
 * Determine applicable controls based on questionnaire responses
 */
export async function determineControlsFromQuestionnaire(
  userId: string
): Promise<RuleEngineResult> {
  const questionnaireResponse = await QuestionnaireResponse.findOne({ userId });
  
  if (!questionnaireResponse) {
    return { applicableControls: [], reasoning: ['No questionnaire response found'] };
  }

  const applicableControlIds = new Set<string>();
  const reasoning: string[] = [];

  // Get all controls that match questionnaire responses
  const controls = await Control.find({
    _id: { $in: questionnaireResponse.applicableControls },
  });

  controls.forEach(control => {
    applicableControlIds.add(control._id.toString());
    reasoning.push(`Control ${control.controlId} applicable based on questionnaire`);
  });

  return {
    applicableControls: Array.from(applicableControlIds),
    reasoning,
  };
}

/**
 * Map controls to assets based on asset type and criticality
 */
export async function mapControlsToAssets(
  userId: string
): Promise<Map<string, string[]>> {
  const assets = await Asset.find({ userId });
  const controlMap = new Map<string, string[]>();

  for (const asset of assets) {
    const applicableControls = await Control.find({
      $and: [
        {
          $or: [
            { controlType: ControlType.TRANSVERSAL },
            {
              controlType: ControlType.SPECIFIC,
              applicableAssetTypes: asset.assetType,
            },
          ],
        },
        {
          $or: [
            { minCriticalityLevel: { $exists: false } },
            { minCriticalityLevel: { $lte: asset.criticalityLevel } },
          ],
        },
      ],
    });

    controlMap.set(
      asset._id.toString(),
      applicableControls.map(c => c._id.toString())
    );
  }

  return controlMap;
}

/**
 * Filter controls by DORA pillar
 */
export async function filterControlsByPillar(
  pillar: DORAPillar,
  userId: string
): Promise<string[]> {
  const questionnaireResponse = await QuestionnaireResponse.findOne({ userId });
  const applicableControlIds = questionnaireResponse?.applicableControls || [];

  const controls = await Control.find({
    pillar,
    _id: { $in: applicableControlIds },
  });

  return controls.map(c => c._id.toString());
}

/**
 * Calculate compliance score for a pillar
 */
export async function calculateComplianceScore(
  pillar: DORAPillar,
  userId: string
): Promise<{
  totalControls: number;
  implementedControls: number;
  compliancePercentage: number;
}> {
  const controlIds = await filterControlsByPillar(pillar, userId);
  
  // In a real implementation, you would check evidence/status for each control
  // For now, this is a placeholder
  const totalControls = controlIds.length;
  const implementedControls = 0; // Would be calculated based on evidence/status
  const compliancePercentage = totalControls > 0 
    ? Math.round((implementedControls / totalControls) * 100) 
    : 0;

  return {
    totalControls,
    implementedControls,
    compliancePercentage,
  };
}

