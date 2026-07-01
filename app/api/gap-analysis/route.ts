import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import GapAnalysis from '@/models/GapAnalysis';
import Control, { getControlModel } from '@/models/Control';
import Asset from '@/models/Asset';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import Question, { getQuestionModel } from '@/models/Question';
import { getAuthUser } from '@/lib/auth-helper';
import { DORAPillar } from '@/models/DORARequirement';
import { ControlStatus } from '@/models/Control';
import { RegulationType, getRegulationConfig } from '@/lib/regulations';

import { ensureControlsSetup } from '@/lib/auto-controls';
import {
  computeQuestionnaireControlMapping,
  summarizePillarAnswers,
  filterApplicableControlsForPillar,
  evaluateControlStatus,
  calculateCompliancePercentage,
} from '@/lib/compliance-engine';

function getPillarsForRegulation(regulationType: RegulationType | string | null) {
  if (!regulationType || regulationType === RegulationType.DORA) {
    return ['ICT_RISK_MANAGEMENT', 'INCIDENT_MANAGEMENT', 'RESILIENCE_TESTING', 'THIRD_PARTY_RISK', 'INFORMATION_SHARING'];
  }
  const config = getRegulationConfig(regulationType as RegulationType);
  return config.pillars.map(p => p.id);
}


// GET gap analysis for user
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = user;
    const searchParams = request.nextUrl.searchParams;
    const pillar = searchParams.get('pillar');
    const regulation = searchParams.get('regulation') || RegulationType.DORA;
    const regulationPillars = getPillarsForRegulation(regulation);
    
    const query: any = { userId: payload.userId };
    if (pillar) {
      // Verify pillar belongs to regulation
      if (regulationPillars.includes(pillar)) {
        query.pillar = pillar;
      } else {
        return NextResponse.json({ gapAnalyses: [] });
      }
    } else {
      // Filter by regulation pillars
      query.pillar = { $in: regulationPillars };
    }
    
    // Local storage doesn't support populate
    const gapAnalyses = await GapAnalysis.find(query, { createdAt: -1 });
    
    return NextResponse.json({ gapAnalyses });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Generate gap analysis
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Ensure controls are created before gap analysis
    await ensureControlsSetup();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = user;
    const body = await request.json();
    const { pillar, regulation } = body;
    const regulationType = regulation || RegulationType.DORA;
    const regulationPillars = getPillarsForRegulation(regulationType);
    
    if (!pillar) {
      return NextResponse.json(
        { error: 'Pillar is required' },
        { status: 400 }
      );
    }
    
    // Validate pillar belongs to regulation
    if (!regulationPillars.includes(pillar)) {
      return NextResponse.json(
        { error: `Pillar ${pillar} is not valid for regulation ${regulationType}` },
        { status: 400 }
      );
    }
    
    // Step 1: Get user's assets
    const assets = await Asset.find({ userId: String(payload.userId) });
    
    // Step 2: Get questionnaire response to determine applicable controls
    const questionnaireResponse = await QuestionnaireResponse.findOne({ userId: String(payload.userId) });
    
    // Step 3: Get all requirements for this pillar (for reference/display only)
    // Use RequirementOperations to get requirements for the correct regulation
    const { RequirementOperations } = await import('@/lib/model-operations');
    const allRequirements = await RequirementOperations.findByRegulation(regulationType, { pillar });
    
    // Step 4: Get all controls for this pillar (regulation-scoped in local storage)
    const ControlModel = isLocalStorage() ? getControlModel(regulationType) : Control;
    const allControlsForPillar = await ControlModel.find({ pillar });
    
    const QuestionModel = isLocalStorage() ? getQuestionModel(regulationType) : Question;
    const questionsForPillar = await QuestionModel.find({ pillar });

    let pillarSummary = {
      hasNoAnswers: false,
      hasYesAnswers: false,
      allYesOrNA: false,
      noAnswerQuestionIds: [] as string[],
      yesAnswerQuestionIds: [] as string[],
    };

    const applicableControlIdsFromQuestionnaire = new Set<string>();
    let controlReasoningMap: Record<string, string[]> = {};

    if (questionnaireResponse?.answers?.length) {
      pillarSummary = summarizePillarAnswers(questionsForPillar, questionnaireResponse.answers);

      // Always recompute mappings fresh to avoid stale control ID mismatches
      const freshMapping = await computeQuestionnaireControlMapping(
        questionnaireResponse.answers,
        regulationType as RegulationType
      );
      freshMapping.applicableControlIds.forEach((id) => applicableControlIdsFromQuestionnaire.add(id));
      controlReasoningMap = freshMapping.controlReasoning;

      console.log(
        `📋 Pillar ${pillar}: hasNo=${pillarSummary.hasNoAnswers}, allYesOrNA=${pillarSummary.allYesOrNA}, applicableControls=${applicableControlIdsFromQuestionnaire.size}`
      );
    }

    let controlsToAnalyze: any[] = [];

    if (!questionnaireResponse) {
      console.log(`📋 No questionnaire — baseline analysis for ${allControlsForPillar.length} controls`);
      controlsToAnalyze = allControlsForPillar;
    } else if (pillarSummary.allYesOrNA || (!pillarSummary.hasNoAnswers && applicableControlIdsFromQuestionnaire.size === 0)) {
      console.log(`📋 All Yes/NA for pillar ${pillar} — no gaps (100% compliance)`);
      controlsToAnalyze = [];
    } else {
      controlsToAnalyze = filterApplicableControlsForPillar(
        allControlsForPillar,
        applicableControlIdsFromQuestionnaire
      );
      console.log(
        `📋 Filtered to ${controlsToAnalyze.length} gap controls for pillar ${pillar} (from ${allControlsForPillar.length} total)`
      );
    }

    const hasNoAnswersForPillar = pillarSummary.hasNoAnswers;
    
    // Step 6: Analyze gaps for each control
    const gaps = [];
    let implementedCount = 0;
    let notApplicableCount = 0;
    
    for (const control of controlsToAnalyze) {
      // Step 6a: Determine which assets this control applies to
      const applicableAssets = assets.filter((asset: any) => {
        // Check control type
        if (control.controlType === 'TRANSVERSAL') {
          // Transversal controls apply to all assets, but check criticality level
          if (control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return true;
        } else if (control.controlType === 'SPECIFIC') {
          // Specific controls apply to specific asset types
          const matchesType = control.applicableAssetTypes?.includes(asset.assetType) || false;
          if (matchesType && control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return matchesType;
        }
        return false;
      });
      
      // Step 6b: Determine control status
      let status: ControlStatus = ControlStatus.NOT_IMPLEMENTED;
      let gapDescription = '';
      
      if (applicableAssets.length === 0) {
        status = ControlStatus.NOT_APPLICABLE;
        gapDescription = 'No applicable assets found for this control';
        notApplicableCount++;
      } else {
        const evaluated = evaluateControlStatus(control, applicableAssets);
        status = evaluated.status;
        gapDescription = evaluated.gapDescription;
        implementedCount += evaluated.implementedWeight;
      }
      
      // Step 6c: Determine priority based on asset criticality and requirement priority
      const maxCriticality = applicableAssets.length > 0 
        ? Math.max(...applicableAssets.map((a: any) => a.criticalityLevel || 1))
        : 1;
      
      // Also check requirement compliance status for priority
      const controlRequirements = allRequirements.filter((req: any) => {
        if (control.requirementIds && control.requirementIds.length > 0) {
          return control.requirementIds.some((reqId: any) => {
            return String(reqId) === String(req._id || req.requirementId);
          });
        }
        return false;
      });
      
      const hasNonCompliantRequirements = controlRequirements.some(
        (req: any) => req.complianceStatus === 'NOT_COMPLIANT' || req.complianceStatus === 'PARTIALLY_COMPLIANT'
      );
      
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (maxCriticality >= 4 || hasNonCompliantRequirements) {
        priority = 'CRITICAL';
      } else if (maxCriticality >= 3) {
        priority = 'HIGH';
      } else if (maxCriticality >= 2) {
        priority = 'MEDIUM';
      }
      
      // Step 6d: Store controlId as string for compatibility
      let controlId: string;
      if (control._id) {
        controlId = typeof control._id === 'string' ? control._id : String(control._id);
      } else if (control.controlId) {
        controlId = typeof control.controlId === 'string' ? control.controlId : String(control.controlId);
      } else {
        controlId = ''; // Fallback
        continue; // Skip if no valid ID
      }
      
      // Get requirement IDs and names for this control
      const requirementIds: string[] = [];
      const requirementNames: string[] = [];
      
      if (control.requirementIds && control.requirementIds.length > 0) {
        control.requirementIds.forEach((reqId: any) => {
          const reqIdStr = String(reqId);
          requirementIds.push(reqIdStr);
          
          // Find the requirement name
          const requirement = allRequirements.find((req: any) => 
            String(req._id || req.requirementId) === reqIdStr
          );
          if (requirement) {
            requirementNames.push(requirement.requirementId || requirement.title || reqIdStr);
          }
        });
      }
      
      // Get control title - check multiple possible fields
      let controlTitle = 'Control';
      if (control.title) {
        controlTitle = control.title;
      } else if (control.controlId) {
        controlTitle = control.controlId; // Fallback to ID if title missing
      }
      
      // Get control description
      const controlDescription = control.description || '';
      
      // Get reasoning from questionnaire response if available
      let reasoning: string[] = [];
      if (controlReasoningMap[controlId]?.length) {
        reasoning = controlReasoningMap[controlId];
      } else if (questionnaireResponse && (questionnaireResponse as any).controlReasoning) {
        const controlReasoning = (questionnaireResponse as any).controlReasoning;
        reasoning = controlReasoning[controlId] || controlReasoning[String(control.controlId)] || [];
      }
      
      // If no reasoning from questionnaire, generate basic reasoning
      if (reasoning.length === 0) {
        if (status === ControlStatus.NOT_APPLICABLE) {
          reasoning.push('Not applicable: No assets match the control criteria (type and criticality)');
        } else if (status === ControlStatus.NOT_IMPLEMENTED) {
          reasoning.push(`Gap identified: Control not implemented for ${applicableAssets.length} applicable asset(s)`);
        } else {
          reasoning.push(`Control status: ${status}`);
        }
      }
      
      gaps.push({
        controlId: controlId,
        controlTitle: controlTitle,
        controlDescription: controlDescription,
        requirementIds: requirementIds,
        requirementNames: requirementNames,
        status,
        gapDescription,
        priority,
        reasoning: reasoning, // Add reasoning for transparency
      });
    }
    
    // Step 7: Calculate compliance metrics
    const totalControls = controlsToAnalyze.length;
    const applicableControlsCount = totalControls - notApplicableCount; // Exclude not applicable
    
    const compliancePercentage = calculateCompliancePercentage(
      gaps,
      pillarSummary,
      !!questionnaireResponse
    );
    
    // Log compliance calculation details
    console.log(`📊 Compliance Calculation:`);
    console.log(`   Total controls analyzed: ${totalControls}`);
    console.log(`   Applicable controls: ${applicableControlsCount}`);
    console.log(`   Implemented: ${implementedCount}`);
    console.log(`   Not applicable: ${notApplicableCount}`);
    console.log(`   Compliance: ${compliancePercentage}%`);
    if (questionnaireResponse) {
      console.log(`   Based on questionnaire: YES (${applicableControlIdsFromQuestionnaire.size} controls)`);
    } else {
      console.log(`   Based on questionnaire: NO (using all controls)`);
    }
    
    // Step 8: Save gap analysis
    // Ensure all data is properly formatted for local storage
    const gapAnalysisData = {
      userId: String(payload.userId), // Always convert to string for local storage
      pillar,
      gaps: gaps.map((gap: any) => ({
        controlId: String(gap.controlId), // Ensure controlId is string
        controlTitle: gap.controlTitle || '',
        controlDescription: gap.controlDescription || '',
        requirementIds: gap.requirementIds || [],
        requirementNames: gap.requirementNames || [],
        status: gap.status,
        gapDescription: gap.gapDescription,
        priority: gap.priority,
        reasoning: gap.reasoning || [], // Include reasoning for transparency
      })),
      totalControls,
      implementedControls: Math.round(implementedCount),
      compliancePercentage,
    };
    
    // Save to database (local storage will handle string conversion)
    const gapAnalysis = await GapAnalysis.findOneAndUpdate(
      { 
        userId: String(payload.userId), 
        pillar,
        regulationType: regulationType,
      },
      {
        ...gapAnalysisData,
        regulationType: regulationType,
      },
      { upsert: true, new: true }
    );
    
    // Calculate findings by priority and status
    const findingsByPriority = {
      CRITICAL: gaps.filter((g: any) => g.priority === 'CRITICAL').length,
      HIGH: gaps.filter((g: any) => g.priority === 'HIGH').length,
      MEDIUM: gaps.filter((g: any) => g.priority === 'MEDIUM').length,
      LOW: gaps.filter((g: any) => g.priority === 'LOW').length,
    };

    const findingsByStatus = {
      NOT_IMPLEMENTED: gaps.filter((g: any) => g.status === ControlStatus.NOT_IMPLEMENTED).length,
      PARTIALLY_IMPLEMENTED: gaps.filter((g: any) => g.status === ControlStatus.PARTIALLY_IMPLEMENTED).length,
      FULLY_IMPLEMENTED: gaps.filter((g: any) => g.status === ControlStatus.FULLY_IMPLEMENTED).length,
      NOT_APPLICABLE: gaps.filter((g: any) => g.status === ControlStatus.NOT_APPLICABLE).length,
    };

    return NextResponse.json({
      gapAnalysis,
      summary: {
        totalControls,
        applicableControls: applicableControlsCount,
        implementedControls: Math.round(implementedCount),
        notApplicable: notApplicableCount,
        compliancePercentage,
        gaps: gaps.filter((g: any) => g.status === ControlStatus.NOT_IMPLEMENTED).length,
        criticalGaps: gaps.filter((g: any) => g.priority === 'CRITICAL' && g.status === ControlStatus.NOT_IMPLEMENTED).length,
        findingsByPriority,
        findingsByStatus,
      },
    });
  } catch (error: any) {
    console.error('Gap analysis error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
