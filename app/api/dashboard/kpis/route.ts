import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import GapAnalysis from '@/models/GapAnalysis';
import Asset from '@/models/Asset';
import RemediationPlan from '@/models/RemediationPlan';
import User from '@/models/User';
import { getAuthUser, getAuthUserContext } from '@/lib/auth-helper';
import { UserRole } from '@/models/Organization';
import { DORAPillar } from '@/models/DORARequirement';
import { ControlStatus } from '@/models/Control';
import { buildDataQuery, extractFilterParams } from '@/lib/query-helpers';

const DORA_PILLARS: DORAPillar[] = [
  'ICT_RISK_MANAGEMENT',
  'INCIDENT_MANAGEMENT',
  'RESILIENCE_TESTING',
  'THIRD_PARTY_RISK',
  'INFORMATION_SHARING',
];

// Risk multipliers based on criticality level (for max loss estimation)
const CRITICALITY_MULTIPLIERS: Record<number, number> = {
  1: 10000,    // Low criticality: €10k base
  2: 50000,    // Medium criticality: €50k base
  3: 200000,   // High criticality: €200k base
  4: 1000000,  // Critical: €1M base
};

// Gap severity multipliers
const GAP_SEVERITY_MULTIPLIERS: Record<string, number> = {
  'CRITICAL': 1.0,   // Full impact
  'HIGH': 0.7,       // 70% impact
  'MEDIUM': 0.4,     // 40% impact
  'LOW': 0.1,        // 10% impact
};

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check auth
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use buildDataQuery for consistent multi-tenant filtering
    const filterParams = extractFilterParams(request);
    const { query: baseQuery } = await buildDataQuery(userContext, filterParams);
    
    // Log the query for debugging
    console.log('📊 KPIs Query:', JSON.stringify(baseQuery, null, 2));
    console.log('📊 Filter Params:', JSON.stringify(filterParams, null, 2));
    
    // Build queries for each data type (all use the same base filter)
    const gapAnalysisQuery = { ...baseQuery };
    const remediationQuery = { ...baseQuery };
    const assetQuery = { ...baseQuery };
    
    // Get all gap analyses for the selected organization/affiliate
    const gapAnalyses = await GapAnalysis.find(gapAnalysisQuery);
    console.log(`📊 Found ${gapAnalyses.length} gap analyses`);
    
    // Get all remediation plans for the selected organization/affiliate
    const remediationPlans = await RemediationPlan.find(remediationQuery);
    console.log(`📊 Found ${remediationPlans.length} remediation plans`);
    
    // Create a map of controlId -> remediation status for quick lookup
    const remediationStatusMap = new Map<string, string>();
    remediationPlans.forEach((plan: any) => {
      if (plan.actions && Array.isArray(plan.actions)) {
        plan.actions.forEach((action: any) => {
          const controlId = String(action.controlId);
          remediationStatusMap.set(controlId, action.status || 'NOT_STARTED');
        });
      }
    });
    
    // Get all assets for the selected organization/affiliate
    const assets = await Asset.find(assetQuery);
    console.log(`📊 Found ${assets.length} assets`);
    
    // Calculate compliance per pillar
    const pillarCompliance: Record<string, {
      compliancePercentage: number;
      totalControls: number;
      implementedControls: number;
      gaps: number;
      criticalGaps: number;
    }> = {};
    
    // Initialize all pillars
    DORA_PILLARS.forEach(pillar => {
      pillarCompliance[pillar] = {
        compliancePercentage: 0,
        totalControls: 0,
        implementedControls: 0,
        gaps: 0,
        criticalGaps: 0,
      };
    });
    
    // Process gap analyses with remediation status consideration
    gapAnalyses.forEach((analysis: any) => {
      const pillar = analysis.pillar;
      if (pillarCompliance[pillar]) {
        pillarCompliance[pillar].totalControls += analysis.totalControls || 0;
        
        // Recalculate implemented controls based on remediation status
        let implementedCount = analysis.implementedControls || 0;
        let notImplementedGaps = 0;
        let criticalGapsCount = 0;
        
        if (analysis.gaps && Array.isArray(analysis.gaps)) {
          analysis.gaps.forEach((gap: any) => {
            const controlId = String(gap.controlId);
            const remediationStatus = remediationStatusMap.get(controlId);
            
            // If remediation is completed, count as implemented
            if (remediationStatus === 'COMPLETED') {
              if (gap.status === ControlStatus.NOT_IMPLEMENTED || gap.status === ControlStatus.PARTIALLY_IMPLEMENTED) {
                implementedCount += 1; // Count as fully implemented now
              }
            } else if (remediationStatus === 'IN_PROGRESS') {
              // If in progress, count as partially implemented
              if (gap.status === ControlStatus.NOT_IMPLEMENTED) {
                implementedCount += 0.5; // Count as half implemented
              }
            }
            
            // Count gaps (excluding completed remediation actions)
            if (gap.status === ControlStatus.NOT_IMPLEMENTED || gap.status === ControlStatus.PARTIALLY_IMPLEMENTED) {
              // Only count as gap if remediation is not completed
              if (remediationStatus !== 'COMPLETED') {
                notImplementedGaps += 1;
                
                // Count critical gaps
                if (gap.priority === 'CRITICAL') {
                  criticalGapsCount += 1;
                }
              }
            }
          });
        }
        
        pillarCompliance[pillar].implementedControls = Math.round(implementedCount);
        pillarCompliance[pillar].gaps = notImplementedGaps;
        pillarCompliance[pillar].criticalGaps = criticalGapsCount;
        
        // Recalculate compliance percentage
        const totalControls = pillarCompliance[pillar].totalControls;
        const relevantControls = totalControls; // All controls are relevant
        pillarCompliance[pillar].compliancePercentage = relevantControls > 0
          ? Math.round((implementedCount / relevantControls) * 100)
          : 0;
      }
    });
    
    // Calculate overall compliance
    let totalCompliance = 0;
    let pillarCount = 0;
    Object.values(pillarCompliance).forEach(pillar => {
      if (pillar.totalControls > 0) {
        totalCompliance += pillar.compliancePercentage;
        pillarCount++;
      }
    });
    const overallCompliance = pillarCount > 0 ? Math.round(totalCompliance / pillarCount) : 0;
    
    // Calculate estimated max loss
    let estimatedMaxLoss = 0;
    
    // For each gap analysis, calculate potential loss
    gapAnalyses.forEach((analysis: any) => {
      if (!analysis.gaps || !Array.isArray(analysis.gaps)) return;
      
      analysis.gaps.forEach((gap: any) => {
        const controlId = String(gap.controlId);
        const remediationStatus = remediationStatusMap.get(controlId);
        
        // Only count non-implemented or partially implemented gaps that are not completed in remediation
        if ((gap.status === ControlStatus.NOT_IMPLEMENTED || gap.status === ControlStatus.PARTIALLY_IMPLEMENTED) 
            && remediationStatus !== 'COMPLETED') {
          // Find assets that would be affected by this gap
          // For now, we'll use a simplified approach based on gap priority
          const severityMultiplier = GAP_SEVERITY_MULTIPLIERS[gap.priority] || 0.1;
          
          // Reduce severity if remediation is in progress
          const adjustedMultiplier = remediationStatus === 'IN_PROGRESS' 
            ? severityMultiplier * 0.5  // Reduce risk by 50% if in progress
            : severityMultiplier;
          
          // Calculate loss based on asset criticality
          // We'll use the highest criticality level as a proxy
          const maxAssetCriticality = assets.length > 0
            ? Math.max(...assets.map((a: any) => a.criticalityLevel || 1))
            : 1;
          
          const baseLoss = CRITICALITY_MULTIPLIERS[maxAssetCriticality] || CRITICALITY_MULTIPLIERS[1];
          const gapLoss = baseLoss * adjustedMultiplier;
          
          estimatedMaxLoss += gapLoss;
        }
      });
    });
    
    // Format estimated max loss
    const formatCurrency = (amount: number) => {
      if (amount >= 1000000) {
        return `€${(amount / 1000000).toFixed(2)}M`;
      } else if (amount >= 1000) {
        return `€${(amount / 1000).toFixed(0)}K`;
      }
      return `€${amount.toFixed(0)}`;
    };
    
    return NextResponse.json({
      overallCompliance,
      pillarCompliance,
      estimatedMaxLoss: Math.round(estimatedMaxLoss),
      estimatedMaxLossFormatted: formatCurrency(estimatedMaxLoss),
      totalAssets: assets.length,
      totalGapAnalyses: gapAnalyses.length,
    });
  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

