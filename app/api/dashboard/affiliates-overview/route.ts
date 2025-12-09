import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import { getAuthUserContext } from '@/lib/auth-helper';
import { UserRole } from '@/models/Organization';
import Affiliate from '@/models/Affiliate';
import Organization from '@/models/Organization';
import User from '@/models/User';
import DORARequirement from '@/models/DORARequirement';
import Control from '@/models/Control';
import Evidence from '@/models/Evidence';
import GapAnalysis from '@/models/GapAnalysis';

interface PillarMetrics {
  pillar: string;
  totalRequirements: number;
  requirementsWithControls: number;
  totalControls: number;
  implementedControls: number;
  compliancePercentage: number;
  completenessPercentage: number;
  gaps: number;
  criticalGaps: number;
}

interface AffiliateOverview {
  affiliateId: string;
  affiliateName: string;
  organizationId: string;
  organizationName: string;
  totalUsers: number;
  overallCompliance: number;
  overallCompleteness: number;
  totalRequirements: number;
  requirementsWithControls: number;
  totalControls: number;
  implementedControls: number;
  totalGaps: number;
  criticalGaps: number;
  pillarBreakdown: PillarMetrics[];
}

/**
 * GET /api/dashboard/affiliates-overview
 * Get overview of all affiliates with compliance metrics (SuperAdmin only)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SuperAdmin can access this endpoint
    if (userContext.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ 
        error: 'Forbidden: Only SuperAdmin can access affiliates overview' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Get all affiliates
    let affiliateQuery: any = {};
    if (organizationId && organizationId !== 'all' && userContext.organizationId) {
      affiliateQuery.organizationId = organizationId === userContext.organizationId 
        ? userContext.organizationId 
        : organizationId;
    } else if (userContext.organizationId) {
      affiliateQuery.organizationId = userContext.organizationId;
    }

    const affiliates = await Affiliate.find(affiliateQuery);
    const organizations = await Organization.find({});
    const orgMap = new Map(organizations.map(org => [String(org._id), org.name]));

    // Get all requirements and controls
    const allRequirements = await DORARequirement.find({});
    const allControls = await Control.find({});

    // Build requirement to controls mapping
    const requirementToControls = new Map<string, Set<string>>();
    allControls.forEach(control => {
      if (control.requirementIds && Array.isArray(control.requirementIds)) {
        control.requirementIds.forEach((reqId: any) => {
          const reqIdStr = String(reqId);
          if (!requirementToControls.has(reqIdStr)) {
            requirementToControls.set(reqIdStr, new Set());
          }
          requirementToControls.get(reqIdStr)!.add(String(control._id || control.controlId));
        });
      }
    });

    const affiliatesOverview: AffiliateOverview[] = [];

    for (const affiliate of affiliates) {
      // Get users for this affiliate
      const users = await User.find({ affiliateId: affiliate._id });
      const userIds = users.map(u => u._id.toString());

      // Get evidence for these users
      const evidences = await Evidence.find({ userId: { $in: userIds } });
      const evidenceControlIds = new Set(evidences.map(e => String(e.controlId)).filter(Boolean));

      // Get gap analyses and remediation plans
      const gapAnalyses = await GapAnalysis.find({ userId: { $in: userIds } });
      const remediationPlans = await RemediationPlan.find({ userId: { $in: userIds } });

      const remediationStatusMap = new Map<string, string>();
      remediationPlans.forEach((plan: any) => {
        if (plan.actions && Array.isArray(plan.actions)) {
          plan.actions.forEach((action: any) => {
            remediationStatusMap.set(String(action.controlId), action.status || 'NOT_STARTED');
          });
        }
      });

      // Calculate pillar metrics
      const pillarMetrics: Record<string, {
        totalRequirements: Set<string>;
        requirementsWithControls: Set<string>;
        totalControls: Set<string>;
        implementedControls: Set<string>;
        gaps: Set<string>;
        criticalGaps: Set<string>;
      }> = {};

      DORA_PILLARS.forEach(pillar => {
        pillarMetrics[pillar] = {
          totalRequirements: new Set(),
          requirementsWithControls: new Set(),
          totalControls: new Set(),
          implementedControls: new Set(),
          gaps: new Set(),
          criticalGaps: new Set(),
        };
      });

      gapAnalyses.forEach((analysis: any) => {
        const pillar = analysis.pillar;
        if (pillarMetrics[pillar]) {
          if (analysis.requirements && Array.isArray(analysis.requirements)) {
            analysis.requirements.forEach((req: any) => {
              pillarMetrics[pillar].totalRequirements.add(String(req.requirementId));
              if (req.controls && req.controls.length > 0) {
                pillarMetrics[pillar].requirementsWithControls.add(String(req.requirementId));
              }
            });
          }

          if (analysis.controlsToAnalyze && Array.isArray(analysis.controlsToAnalyze)) {
            analysis.controlsToAnalyze.forEach((controlId: string) => {
              pillarMetrics[pillar].totalControls.add(String(controlId));
            });
          }

          if (analysis.gaps && Array.isArray(analysis.gaps)) {
            analysis.gaps.forEach((gap: any) => {
              const controlId = String(gap.controlId);
              const remediationStatus = remediationStatusMap.get(controlId);

              if (remediationStatus === 'COMPLETED') {
                pillarMetrics[pillar].implementedControls.add(controlId);
              } else if (gap.status === ControlStatus.FULLY_IMPLEMENTED) {
                pillarMetrics[pillar].implementedControls.add(controlId);
              } else {
                pillarMetrics[pillar].gaps.add(controlId);
                if (gap.priority === 'CRITICAL') {
                  pillarMetrics[pillar].criticalGaps.add(controlId);
                }
              }
            });
          }
        }
      });

      const pillarBreakdown = DORA_PILLARS.map(pillar => {
        const totalRequirements = pillarMetrics[pillar].totalRequirements.size;
        const requirementsWithControls = pillarMetrics[pillar].requirementsWithControls.size;
        const totalControls = pillarMetrics[pillar].totalControls.size;
        const implementedControls = pillarMetrics[pillar].implementedControls.size;
        const gaps = pillarMetrics[pillar].gaps.size;
        const criticalGaps = pillarMetrics[pillar].criticalGaps.size;

        const compliancePercentage = totalControls > 0 
          ? Math.round((implementedControls / totalControls) * 100) 
          : 0;
        const completenessPercentage = totalRequirements > 0
          ? Math.round((requirementsWithControls / totalRequirements) * 100)
          : 0;

        return {
          pillar,
          totalRequirements,
          requirementsWithControls,
          totalControls,
          implementedControls,
          compliancePercentage,
          completenessPercentage,
          gaps,
          criticalGaps,
        };
      });

      const overallTotalRequirements = pillarBreakdown.reduce((sum, p) => sum + p.totalRequirements, 0);
      const overallRequirementsWithControls = pillarBreakdown.reduce((sum, p) => sum + p.requirementsWithControls, 0);
      const overallTotalControls = pillarBreakdown.reduce((sum, p) => sum + p.totalControls, 0);
      const overallImplementedControls = pillarBreakdown.reduce((sum, p) => sum + p.implementedControls, 0);
      const overallTotalGaps = pillarBreakdown.reduce((sum, p) => sum + p.gaps, 0);
      const overallCriticalGaps = pillarBreakdown.reduce((sum, p) => sum + p.criticalGaps, 0);

      const overallCompliance = overallTotalControls > 0 
        ? Math.round((overallImplementedControls / overallTotalControls) * 100) 
        : 0;
      const overallCompleteness = overallTotalRequirements > 0
        ? Math.round((overallRequirementsWithControls / overallTotalRequirements) * 100)
        : 0;

      affiliatesOverview.push({
        affiliateId: affiliate.affiliateId,
        affiliateName: affiliate.name,
        organizationId: String(affiliate.organizationId),
        organizationName: orgMap.get(String(affiliate.organizationId)) || 'Unknown',
        totalUsers: users.length,
        overallCompliance,
        overallCompleteness,
        totalRequirements: overallTotalRequirements,
        requirementsWithControls: overallRequirementsWithControls,
        totalControls: overallTotalControls,
        implementedControls: overallImplementedControls,
        totalGaps: overallTotalGaps,
        criticalGaps: overallCriticalGaps,
        pillarBreakdown,
      });
    }

    return NextResponse.json({ affiliates: affiliatesOverview });
  } catch (error: any) {
    console.error('Error fetching affiliates overview:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

