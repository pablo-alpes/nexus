import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import GapAnalysis from '@/models/GapAnalysis';
import Control from '@/models/Control';
import Asset from '@/models/Asset';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import DORARequirement from '@/models/DORARequirement';
import Question from '@/models/Question';
import { getAuthUser } from '@/lib/auth-helper';
import { DORAPillar } from '@/models/DORARequirement';
import { ControlStatus } from '@/models/Control';
import { ensureControlsSetup } from '@/lib/auto-controls';

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
    const pillar = searchParams.get('pillar') as DORAPillar;
    
    const query: any = { userId: payload.userId };
    if (pillar) query.pillar = pillar;
    
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
    const { pillar } = body;
    
    if (!pillar) {
      return NextResponse.json(
        { error: 'Pillar is required' },
        { status: 400 }
      );
    }
    
    // Step 1: Get user's assets
    const assets = await Asset.find({ userId: String(payload.userId) });
    
    // Step 2: Get questionnaire response to determine applicable controls
    const questionnaireResponse = await QuestionnaireResponse.findOne({ userId: String(payload.userId) });
    
    // Step 3: Get all requirements for this pillar
    const allRequirements = await DORARequirement.find({ pillar });
    
    // Step 4: Determine which requirements are applicable based on questionnaire
    const applicableRequirementIds = new Set<string>();
    
    if (questionnaireResponse && questionnaireResponse.answers) {
      // Get all questions that were answered "yes"
      for (const answer of questionnaireResponse.answers) {
        if (answer.value === 'yes') {
          const question = await Question.findOne({ _id: answer.questionId });
          if (question && question.options) {
            // Find the "yes" option and get its applicableControls (which are requirement IDs)
            const yesOption = question.options.find((opt: any) => opt.value === 'yes');
            if (yesOption && yesOption.applicableControls) {
              yesOption.applicableControls.forEach((reqId: any) => {
                applicableRequirementIds.add(String(reqId));
              });
            }
          }
          
          // Also add all requirements for this pillar if question is answered yes
          if (question && question.pillar === pillar) {
            allRequirements.forEach((req: any) => {
              applicableRequirementIds.add(String(req._id || req.requirementId));
            });
          }
        }
      }
    }
    
    // If no questionnaire, assume all requirements are applicable
    if (applicableRequirementIds.size === 0) {
      allRequirements.forEach((req: any) => {
        applicableRequirementIds.add(String(req._id || req.requirementId));
      });
    }
    
    // Step 5: Get all controls for this pillar
    const allControlsForPillar = await Control.find({ pillar });
    
    // Step 5a: Determine which controls are applicable based on questionnaire response
    // Using elimination/inclusion logic: "yes" excludes, "no" includes
    const applicableControlIdsFromQuestionnaire = new Set<string>();

    if (questionnaireResponse && questionnaireResponse.applicableControls) {
      questionnaireResponse.applicableControls.forEach((id: any) => {
        applicableControlIdsFromQuestionnaire.add(String(id));
      });
      console.log(`📋 Questionnaire response has ${applicableControlIdsFromQuestionnaire.size} applicable controls (after elimination/inclusion logic)`);
    }

    // Step 5b: Filter controls based on questionnaire response
    // Priority: Questionnaire response > Requirement mapping > All controls
    let filteredControls: any[] = [];
    
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
        console.log(`   ⚠️  WARNING: No controls matched! Sample questionnaire IDs:`, Array.from(applicableControlIdsFromQuestionnaire).slice(0, 5));
        console.log(`   ⚠️  Sample control IDs for pillar:`, allControlsForPillar.slice(0, 3).map((c: any) => ({ _id: c._id, controlId: c.controlId })));
      }
    } 
    // Otherwise, if we have applicable requirements from questionnaire, use requirement mapping
    else if (applicableRequirementIds.size > 0 && applicableRequirementIds.size < allRequirements.length) {
      console.log(`📋 Filtering by requirements: ${applicableRequirementIds.size} applicable requirements`);
      filteredControls = allControlsForPillar.filter((control: any) => {
        if (control.requirementIds && control.requirementIds.length > 0) {
          return control.requirementIds.some((reqId: any) => {
            const reqIdStr = String(reqId);
            return applicableRequirementIds.has(reqIdStr);
          });
        }
        return false; // Only include controls with requirement mappings
      });
      console.log(`   ✅ Filtered to ${filteredControls.length} controls from requirements`);
    }
    // If no questionnaire response or all requirements are applicable, include all controls for this pillar
    else {
      console.log(`📋 No questionnaire filtering: using all ${allControlsForPillar.length} controls for pillar ${pillar}`);
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
        if (control.complianceStatus === 'FULLY_COMPLIANT' || control.status === ControlStatus.FULLY_IMPLEMENTED) {
          status = ControlStatus.FULLY_IMPLEMENTED;
          gapDescription = `Fully implemented for ${applicableAssets.length} asset(s)`;
          implementedCount++;
        } else if (control.complianceStatus === 'PARTIALLY_COMPLIANT' || control.status === ControlStatus.PARTIALLY_IMPLEMENTED) {
          status = ControlStatus.PARTIALLY_IMPLEMENTED;
          gapDescription = `Partially implemented for ${applicableAssets.length} asset(s)`;
          implementedCount += 0.5; // Count as half
        } else {
          status = ControlStatus.NOT_IMPLEMENTED;
          gapDescription = `Not implemented for ${applicableAssets.length} asset(s)`;
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
      
      gaps.push({
        controlId: controlId,
        controlTitle: controlTitle,
        controlDescription: controlDescription,
        requirementIds: requirementIds,
        requirementNames: requirementNames,
        status,
        gapDescription,
        priority,
      });
    }
    
    // Step 7: Calculate compliance metrics
    const totalControls = controlsToAnalyze.length;
    const applicableControlsCount = totalControls - notApplicableCount; // Exclude not applicable
    const compliancePercentage = applicableControlsCount > 0 
      ? Math.round((implementedCount / applicableControlsCount) * 100) 
      : 0;
    
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
      })),
      totalControls,
      implementedControls: Math.round(implementedCount),
      compliancePercentage,
    };
    
    // Save to database (local storage will handle string conversion)
    const gapAnalysis = await GapAnalysis.findOneAndUpdate(
      { userId: String(payload.userId), pillar },
      gapAnalysisData,
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
