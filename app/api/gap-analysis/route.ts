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
    
    // Step 4a: Determine which controls are applicable based on questionnaire response
    // The questionnaire response already contains the correct applicableControls calculated using:
    // 1. Precomputed question-to-requirement mappings (static, from precomputed-mappings.ts)
    // 2. Static requirement-to-control mappings (Control.requirementIds - defined in data)
    // We should NOT recalculate - just use what's stored in questionnaireResponse.applicableControls
    const applicableControlIdsFromQuestionnaire = new Set<string>();

    if (questionnaireResponse && questionnaireResponse.applicableControls) {
      questionnaireResponse.applicableControls.forEach((id: any) => {
        applicableControlIdsFromQuestionnaire.add(String(id));
      });
      console.log(`📋 Questionnaire response has ${applicableControlIdsFromQuestionnaire.size} applicable controls`);
      console.log(`   (Calculated from: Questions → Requirements [precomputed] → Controls [static mapping])`);
    }

    // Step 4b: Filter controls based on questionnaire response
    // The questionnaire response.applicableControls is the source of truth
    // It was calculated using the correct flow: Questions → Requirements → Controls
    let filteredControls: any[] = [];
    
    // Check if there are "No" answers for this pillar in the questionnaire
    let hasNoAnswersForPillar = false;
    if (questionnaireResponse && questionnaireResponse.answers) {
      const QuestionModel = isLocalStorage() ? getQuestionModel(regulationType) : Question;
      const questionsForPillar = await QuestionModel.find({ pillar });
      const questionIdsForPillar = new Set(questionsForPillar.map((q: any) => String(q._id || q.questionId)));
      
      // Check if any answer for this pillar is "no"
      hasNoAnswersForPillar = questionnaireResponse.answers.some((answer: any) => {
        const questionId = String(answer.questionId || answer.question);
        return questionIdsForPillar.has(questionId) && answer.value === 'no';
      });
      
      console.log(`📋 Checking answers for pillar ${pillar}: hasNoAnswers=${hasNoAnswersForPillar}`);
    }
    
    if (questionnaireResponse) {
      // If questionnaire response has applicable controls, ONLY use those (strict filtering)
      if (applicableControlIdsFromQuestionnaire.size > 0) {
        console.log(`📋 Filtering by questionnaire: ${applicableControlIdsFromQuestionnaire.size} applicable controls for pillar ${pillar}`);
        
        // Filter controls that match questionnaire response AND are for this pillar
        filteredControls = allControlsForPillar.filter((control: any) => {
          // Check multiple ID formats for matching
          const controlId1 = String(control._id || '');
          const controlId2 = String(control.controlId || '');
          
          // Check if either ID matches
          const matches = applicableControlIdsFromQuestionnaire.has(controlId1) || 
                         applicableControlIdsFromQuestionnaire.has(controlId2);
          
          return matches;
        });
        
        console.log(`   ✅ Filtered to ${filteredControls.length} controls from questionnaire (out of ${allControlsForPillar.length} total for pillar)`);
        
        // If no controls matched, log for debugging
        if (filteredControls.length === 0) {
          console.log(`   ⚠️  WARNING: No controls matched! This might indicate an ID format mismatch.`);
          console.log(`   ⚠️  Sample questionnaire IDs:`, Array.from(applicableControlIdsFromQuestionnaire).slice(0, 5));
          console.log(`   ⚠️  Sample control IDs for pillar:`, allControlsForPillar.slice(0, 3).map((c: any) => ({ _id: String(c._id), controlId: String(c.controlId || '') })));
          
          // If there are "No" answers but no controls matched, use all controls for this pillar as fallback
          if (hasNoAnswersForPillar) {
            console.log(`   ⚠️  FALLBACK: Using all controls for pillar ${pillar} because there are "No" answers but no controls matched`);
            filteredControls = allControlsForPillar;
          }
        }
      } 
      // If questionnaire response exists but has 0 applicable controls
      else {
        // Check if there are "No" answers - if yes, this is a problem (should have controls)
        if (hasNoAnswersForPillar) {
          console.log(`📋 ⚠️  WARNING: Questionnaire has "No" answers for pillar ${pillar} but 0 applicable controls found!`);
          console.log(`   This indicates missing mappings. Using all controls for pillar as fallback.`);
          console.log(`   Compliance will be calculated based on control implementation status.`);
          filteredControls = allControlsForPillar; // Use all controls as fallback
        } else {
          // No "No" answers and no applicable controls = all answers were "Yes" = 100% compliance
          console.log(`📋 Questionnaire response exists but has 0 applicable controls - this means NO GAPS (all answers were "Yes")`);
          console.log(`   ✅ No controls to analyze - 100% compliance for this pillar`);
          filteredControls = []; // Empty array = no gaps, 100% compliance
        }
      }
    }
    // If no questionnaire response exists, show all controls for this pillar (baseline analysis)
    else {
      console.log(`📋 No questionnaire response found - using all ${allControlsForPillar.length} controls for pillar ${pillar} (baseline analysis)`);
      filteredControls = allControlsForPillar;
    }

    // Use filtered controls for analysis
    const controlsToAnalyze = filteredControls;
    
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
        // Check control compliance status
        // Default to NOT_IMPLEMENTED if no status is set (this is a gap)
        if (control.complianceStatus === 'FULLY_COMPLIANT' || control.status === ControlStatus.FULLY_IMPLEMENTED) {
          status = ControlStatus.FULLY_IMPLEMENTED;
          gapDescription = `Fully implemented for ${applicableAssets.length} asset(s)`;
          implementedCount++;
        } else if (control.complianceStatus === 'PARTIALLY_COMPLIANT' || control.status === ControlStatus.PARTIALLY_IMPLEMENTED) {
          status = ControlStatus.PARTIALLY_IMPLEMENTED;
          gapDescription = `Partially implemented for ${applicableAssets.length} asset(s)`;
          implementedCount += 0.5; // Count as half
        } else {
          // Default: NOT_IMPLEMENTED (this is a gap)
          status = ControlStatus.NOT_IMPLEMENTED;
          gapDescription = `Not implemented for ${applicableAssets.length} asset(s)`;
          // Don't increment implementedCount - this is a gap
        }
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
      if (questionnaireResponse && (questionnaireResponse as any).controlReasoning) {
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
    
    // Calculate compliance percentage
    // If no questionnaire response exists, we can't determine compliance (should be 0)
    // If questionnaire exists but has 0 applicable controls, it means all answers were "Yes" (100% compliance)
    // If questionnaire exists and has applicable controls, calculate based on implemented vs total
    let compliancePercentage: number;
    
    // Count gaps (NOT_IMPLEMENTED controls) for accurate calculation
    const notImplementedGaps = gaps.filter(g => g.status === ControlStatus.NOT_IMPLEMENTED).length;
    const fullyImplemented = gaps.filter(g => g.status === ControlStatus.FULLY_IMPLEMENTED).length;
    const partiallyImplemented = gaps.filter(g => g.status === ControlStatus.PARTIALLY_IMPLEMENTED).length;
    
    if (!questionnaireResponse) {
      // No questionnaire response = can't determine compliance, should be 0%
      compliancePercentage = 0;
    } else if (totalControls === 0 && applicableControlIdsFromQuestionnaire.size === 0 && !hasNoAnswersForPillar) {
      // If questionnaire exists but no controls to analyze AND no applicable controls from questionnaire,
      // AND no "No" answers, it means all answers were "Yes" (100% compliance)
      compliancePercentage = 100;
    } else if (totalControls === 0 && hasNoAnswersForPillar) {
      // If there are "No" answers but no controls found, this is a problem
      // Compliance should be 0% because there are gaps that couldn't be mapped
      console.log(`   ⚠️  WARNING: "No" answers exist but no controls found - setting compliance to 0%`);
      compliancePercentage = 0;
    } else if (applicableControlsCount === 0) {
      // All controls are not applicable
      // If there are gaps (NOT_IMPLEMENTED) or "No" answers, compliance should be 0%
      compliancePercentage = (notImplementedGaps > 0 || hasNoAnswersForPillar) ? 0 : 100;
    } else {
      // Calculate based on implemented vs applicable controls
      // Recalculate using actual gap counts to ensure accuracy
      const totalImplemented = fullyImplemented + (partiallyImplemented * 0.5);
      compliancePercentage = Math.round((totalImplemented / applicableControlsCount) * 100);
      
      // Ensure compliance is never 100% if there are NOT_IMPLEMENTED gaps or "No" answers
      if ((notImplementedGaps > 0 || hasNoAnswersForPillar) && compliancePercentage >= 100) {
        compliancePercentage = Math.max(0, Math.round((totalImplemented / applicableControlsCount) * 100));
      }
    }
    
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
