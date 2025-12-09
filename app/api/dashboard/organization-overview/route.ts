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
import Roadmap from '@/models/Roadmap';
import { DORAPillar } from '@/models/DORARequirement';

const DORA_PILLARS = Object.values(DORAPillar);

interface AffiliateDetail {
  affiliateId: string;
  affiliateName: string;
  totalUsers: number;
  overallCompliance: number;
  overallCompleteness: number;
  totalRequirements: number;
  requirementsWithControls: number;
  totalControls: number;
  implementedControls: number;
  totalGaps: number;
  criticalGaps: number;
  pillarBreakdown: Array<{
    pillar: string;
    totalRequirements: number;
    requirementsWithControls: number;
    totalControls: number;
    implementedControls: number;
    compliancePercentage: number;
    completenessPercentage: number;
    gaps: number;
    criticalGaps: number;
  }>;
  roadmapStatus: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    overdueTasksDetails: Array<{
      taskId: string;
      title: string;
      endDate: string;
      daysOverdue: number;
      assignedTo?: string;
      assignedToName?: string;
      priority: string;
      pillar: string;
    }>;
    tasksByPillar: Record<string, number>;
  };
}

interface OrganizationOverview {
  organizationId: string;
  organizationName: string;
  totalAffiliates: number;
  totalUsers: number;
  overallCompliance: number;
  overallCompleteness: number;
  affiliates: AffiliateDetail[];
}

/**
 * GET /api/dashboard/organization-overview
 * Get complete organization overview with breakdown by affiliate (SuperAdmin only)
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
        error: 'Forbidden: Only SuperAdmin can access organization overview' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId || organizationId === 'all') {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Get organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all affiliates for this organization
    const affiliates = await Affiliate.find({ organizationId });
    
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

    const affiliateDetails: AffiliateDetail[] = [];
    let totalUsers = 0;
    let totalCompliance = 0;
    let totalCompleteness = 0;
    const now = new Date();

    for (const affiliate of affiliates) {
      // Get users for this affiliate
      const users = await User.find({ affiliateId: affiliate._id });
      const userIds = users.map(u => u._id.toString());
      totalUsers += users.length;

      // Get evidence for these users
      const evidences = await Evidence.find({ userId: { $in: userIds } });
      const evidenceControlIds = new Set(evidences.map(e => String(e.controlId)).filter(Boolean));

      // Get gap analyses
      const gapAnalyses = await GapAnalysis.find({ userId: { $in: userIds } });

      // Get roadmaps for these users
      const roadmaps = await Roadmap.find({ userId: { $in: userIds } });
      
      // Calculate roadmap status
      let totalTasks = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;
      let overdueTasks = 0;
      const overdueTasksDetails: AffiliateDetail['roadmapStatus']['overdueTasksDetails'] = [];
      const tasksByPillar: Record<string, number> = {};

      roadmaps.forEach(roadmap => {
        if (roadmap.tasks && Array.isArray(roadmap.tasks)) {
          roadmap.tasks.forEach((task: any) => {
            totalTasks++;
            const pillar = task.pillar || 'UNKNOWN';
            tasksByPillar[pillar] = (tasksByPillar[pillar] || 0) + 1;

            if (task.status === 'COMPLETED') {
              completedTasks++;
            } else if (task.status === 'IN_PROGRESS') {
              inProgressTasks++;
            }

            // Check if overdue
            if (task.status !== 'COMPLETED' && task.endDate) {
              const endDate = new Date(task.endDate);
              if (endDate < now) {
                overdueTasks++;
                const daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                
                // Get assigned user name
                let assignedToName: string | undefined;
                if (task.assignedTo) {
                  const assignedUser = users.find(u => String(u._id) === task.assignedTo || u.email === task.assignedTo);
                  assignedToName = assignedUser?.name || assignedUser?.email;
                }

                overdueTasksDetails.push({
                  taskId: task.taskId,
                  title: task.title,
                  endDate: task.endDate,
                  daysOverdue,
                  assignedTo: task.assignedTo,
                  assignedToName,
                  priority: task.priority || 'MEDIUM',
                  pillar: task.pillar || 'UNKNOWN',
                });
              }
            }
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

      // Count requirements by pillar
      allRequirements.forEach(req => {
        const pillar = req.pillar;
        if (pillarMetrics[pillar]) {
          pillarMetrics[pillar].totalRequirements.add(req.requirementId);
          
          const controlIds = requirementToControls.get(req.requirementId) || new Set();
          if (controlIds.size > 0) {
            pillarMetrics[pillar].requirementsWithControls.add(req.requirementId);
            controlIds.forEach(controlId => {
              pillarMetrics[pillar].totalControls.add(controlId);
              if (evidenceControlIds.has(controlId)) {
                pillarMetrics[pillar].implementedControls.add(controlId);
              }
            });
          }
        }
      });

      // Count gaps from gap analyses
      gapAnalyses.forEach((analysis: any) => {
        const pillar = analysis.pillar;
        if (pillarMetrics[pillar] && analysis.gaps && Array.isArray(analysis.gaps)) {
          analysis.gaps.forEach((gap: any) => {
            const controlId = String(gap.controlId);
            if (gap.status === 'NOT_IMPLEMENTED' || gap.status === 'PARTIALLY_IMPLEMENTED') {
              pillarMetrics[pillar].gaps.add(controlId);
              if (gap.priority === 'CRITICAL') {
                pillarMetrics[pillar].criticalGaps.add(controlId);
              }
            }
          });
        }
      });

      const pillarBreakdown = DORA_PILLARS.map(pillar => {
        const metrics = pillarMetrics[pillar];
        const totalRequirements = metrics.totalRequirements.size;
        const requirementsWithControls = metrics.requirementsWithControls.size;
        const totalControls = metrics.totalControls.size;
        const implementedControls = metrics.implementedControls.size;
        const gaps = metrics.gaps.size;
        const criticalGaps = metrics.criticalGaps.size;

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

      totalCompliance += overallCompliance;
      totalCompleteness += overallCompleteness;

      affiliateDetails.push({
        affiliateId: affiliate.affiliateId,
        affiliateName: affiliate.name,
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
        roadmapStatus: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          overdueTasksDetails: overdueTasksDetails.sort((a, b) => b.daysOverdue - a.daysOverdue),
          tasksByPillar,
        },
      });
    }

    const avgCompliance = affiliateDetails.length > 0 
      ? Math.round(totalCompliance / affiliateDetails.length) 
      : 0;
    const avgCompleteness = affiliateDetails.length > 0 
      ? Math.round(totalCompleteness / affiliateDetails.length) 
      : 0;

    const overview: OrganizationOverview = {
      organizationId: String(organization._id),
      organizationName: organization.name,
      totalAffiliates: affiliates.length,
      totalUsers,
      overallCompliance: avgCompliance,
      overallCompleteness: avgCompleteness,
      affiliates: affiliateDetails,
    };

    return NextResponse.json(overview);
  } catch (error: any) {
    console.error('Error fetching organization overview:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

