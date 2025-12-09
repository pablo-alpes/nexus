import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import { getAuthUserContext } from '@/lib/auth-helper';
import { UserRole } from '@/models/Organization';
import DORARequirement from '@/models/DORARequirement';
import Control from '@/models/Control';
import GapAnalysis from '@/models/GapAnalysis';
import Evidence from '@/models/Evidence';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import { DORAPillar } from '@/models/DORARequirement';
import User from '@/models/User';
import Affiliate from '@/models/Affiliate';
import Organization from '@/models/Organization';

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

interface ComplianceOverview {
  organizationId?: string;
  organizationName?: string;
  affiliateId?: string;
  affiliateName?: string;
  overallCompliance: number;
  overallCompleteness: number;
  totalRequirements: number;
  requirementsWithControls: number;
  totalControls: number;
  implementedControls: number;
  totalUsers: number;
  pillarBreakdown: PillarMetrics[];
}

/**
 * GET /api/dashboard/compliance-overview
 * Get compliance overview for organization/affiliate (SuperAdmin only)
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
        error: 'Forbidden: Only SuperAdmin can access compliance overview' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const affiliateId = searchParams.get('affiliateId');

    // Get all requirements
    const allRequirements = await DORARequirement.find({});
    
    // Get all controls
    const allControls = await Control.find({});

    // Initialize pillar breakdown
    const pillarBreakdown: PillarMetrics[] = Object.values(DORAPillar).map(pillar => ({
      pillar,
      totalRequirements: 0,
      requirementsWithControls: 0,
      totalControls: 0,
      implementedControls: 0,
      compliancePercentage: 0,
      completenessPercentage: 0,
      gaps: 0,
      criticalGaps: 0,
    }));

    // Count requirements by pillar
    allRequirements.forEach(req => {
      const pillarIndex = pillarBreakdown.findIndex(p => p.pillar === req.pillar);
      if (pillarIndex >= 0) {
        pillarBreakdown[pillarIndex].totalRequirements++;
      }
    });

    // Get users for the selected organization/affiliate
    let userQuery: any = {};
    if (affiliateId && affiliateId !== 'all') {
      userQuery.affiliateId = affiliateId;
    } else if (organizationId && organizationId !== 'all') {
      userQuery.organizationId = organizationId;
    } else if (userContext.organizationId) {
      userQuery.organizationId = userContext.organizationId;
    }

    const users = await User.find(userQuery);
    const userIds = users.map(u => u._id.toString());

    // Get gap analyses for these users
    const gapAnalyses = await GapAnalysis.find({ userId: { $in: userIds } });
    
    // Get evidence for these users
    const evidences = await Evidence.find({ userId: { $in: userIds } });
    const evidenceControlIds = new Set(evidences.map(e => String(e.controlId)).filter(Boolean));

    // Get questionnaire responses
    const questionnaireResponses = await QuestionnaireResponse.find({ userId: { $in: userIds } });

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

    // Calculate metrics per pillar
    pillarBreakdown.forEach(pillarMetric => {
      const pillarReqs = allRequirements.filter(req => req.pillar === pillarMetric.pillar);
      
      pillarReqs.forEach(req => {
        const reqId = req.requirementId;
        const controlIds = requirementToControls.get(reqId) || new Set();
        
        if (controlIds.size > 0) {
          pillarMetric.requirementsWithControls++;
          pillarMetric.totalControls += controlIds.size;
          
          // Count implemented controls (those with evidence)
          controlIds.forEach(controlId => {
            if (evidenceControlIds.has(controlId)) {
              pillarMetric.implementedControls++;
            }
          });
        }
      });

      // Calculate percentages
      if (pillarMetric.totalControls > 0) {
        pillarMetric.compliancePercentage = Math.round(
          (pillarMetric.implementedControls / pillarMetric.totalControls) * 100
        );
      }

      if (pillarMetric.totalRequirements > 0) {
        pillarMetric.completenessPercentage = Math.round(
          (pillarMetric.requirementsWithControls / pillarMetric.totalRequirements) * 100
        );
      }

      // Count gaps from gap analyses
      gapAnalyses.forEach(analysis => {
        if (analysis.pillar === pillarMetric.pillar && analysis.gaps) {
          analysis.gaps.forEach((gap: any) => {
            if (gap.status === 'NOT_IMPLEMENTED' || gap.status === 'PARTIALLY_IMPLEMENTED') {
              pillarMetric.gaps++;
              if (gap.priority === 'CRITICAL') {
                pillarMetric.criticalGaps++;
              }
            }
          });
        }
      });
    });

    // Calculate overall metrics
    const totalRequirements = allRequirements.length;
    const requirementsWithControls = Array.from(requirementToControls.keys()).length;
    const totalControls = allControls.length;
    const implementedControls = evidenceControlIds.size;

    const overallCompliance = totalControls > 0
      ? Math.round((implementedControls / totalControls) * 100)
      : 0;

    const overallCompleteness = totalRequirements > 0
      ? Math.round((requirementsWithControls / totalRequirements) * 100)
      : 0;

    // Get organization/affiliate names
    let organizationName: string | undefined;
    let affiliateName: string | undefined;

    if (organizationId && organizationId !== 'all') {
      const org = await Organization.findById(organizationId);
      organizationName = org?.name;
    }

    if (affiliateId && affiliateId !== 'all') {
      const aff = await Affiliate.findById(affiliateId);
      affiliateName = aff?.name;
    }

    const overview: ComplianceOverview = {
      organizationId: organizationId && organizationId !== 'all' ? organizationId : undefined,
      organizationName,
      affiliateId: affiliateId && affiliateId !== 'all' ? affiliateId : undefined,
      affiliateName,
      overallCompliance,
      overallCompleteness,
      totalRequirements,
      requirementsWithControls,
      totalControls,
      implementedControls,
      totalUsers: users.length,
      pillarBreakdown,
    };

    return NextResponse.json({ overview });
  } catch (error: any) {
    console.error('Error fetching compliance overview:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

