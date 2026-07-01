import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import GapAnalysis from '@/models/GapAnalysis';
import Asset from '@/models/Asset';
import RemediationPlan from '@/models/RemediationPlan';
import { getAuthUser } from '@/lib/auth-helper';
import { ControlStatus } from '@/models/Control';
import { RegulationType, getRegulationConfig, getPillars } from '@/lib/regulations';

export const dynamic = 'force-dynamic';

// Get pillars dynamically based on regulation type
function getPillarsForRegulation(regulationType?: string): string[] {
  if (!regulationType || regulationType === RegulationType.DORA) {
    // Default to DORA pillars for backward compatibility
    return [
      'ICT_RISK_MANAGEMENT',
      'INCIDENT_MANAGEMENT',
      'RESILIENCE_TESTING',
      'THIRD_PARTY_RISK',
      'INFORMATION_SHARING',
    ];
  }
  
  // Get pillars from regulation config
  const config = getRegulationConfig(regulationType as RegulationType);
  return config.pillars.map(p => p.id);
}

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
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get regulation type from query parameter (defaults to DORA)
    const searchParams = request.nextUrl.searchParams;
    const regulationParam = searchParams.get('regulation');
    const regulationType = regulationParam || RegulationType.DORA;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f85e8ae0-d382-466b-9574-875e68788737',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/dashboard/kpis/route.ts:56',message:'Regulation parameter received',data:{regulationParam,regulationType,url:request.nextUrl.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Get pillars for this regulation
    const pillars = getPillarsForRegulation(regulationType);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f85e8ae0-d382-466b-9574-875e68788737',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/dashboard/kpis/route.ts:60',message:'Pillars determined',data:{regulationType,pillars},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    const userId = String(user.userId);
    
    // Get all gap analyses for this user and regulation
    const allGapAnalyses = await GapAnalysis.find({ 
      userId,
      regulationType: regulationType,
    });
    
    // Additional filter by regulation pillars (safety check)
    const filteredGapAnalyses = allGapAnalyses.filter((analysis: any) => {
      return pillars.includes(analysis.pillar);
    });
    
    // Get all remediation plans for this user and regulation
    const remediationPlans = await RemediationPlan.find({ 
      userId,
      regulationType: regulationType,
    });
    
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
    
    // Get all assets for this user
    const assets = await Asset.find({ userId });
    
    // Calculate compliance per pillar
    const pillarCompliance: Record<string, {
      compliancePercentage: number;
      totalControls: number;
      implementedControls: number;
      gaps: number;
      criticalGaps: number;
    }> = {};
    
    // Initialize all pillars for the selected regulation
    pillars.forEach(pillar => {
      pillarCompliance[pillar] = {
        compliancePercentage: 0,
        totalControls: 0,
        implementedControls: 0,
        gaps: 0,
        criticalGaps: 0,
      };
    });
    
    // Process gap analyses with remediation status consideration
    filteredGapAnalyses.forEach((analysis: any) => {
      const pillar = analysis.pillar;
      if (pillarCompliance[pillar]) {
        // Recalculate compliance based on gap analysis and remediation status
        // This ensures compliance updates when remediation actions are completed
        pillarCompliance[pillar].totalControls = analysis.totalControls || 0;
        
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
        
        // Recalculate compliance percentage based on updated implemented count
        const totalControls = pillarCompliance[pillar].totalControls;
        pillarCompliance[pillar].compliancePercentage = totalControls > 0
          ? Math.round((implementedCount / totalControls) * 100)
          : (analysis.compliancePercentage ?? 0);
        
        // Fallback: if no gaps array, use original compliance percentage
        if (!analysis.gaps || !Array.isArray(analysis.gaps) || analysis.gaps.length === 0) {
          if (analysis.compliancePercentage !== undefined && analysis.compliancePercentage !== null) {
            pillarCompliance[pillar].compliancePercentage = analysis.compliancePercentage;
          }
          pillarCompliance[pillar].gaps = 0;
          pillarCompliance[pillar].criticalGaps = 0;
        }
        
        
        console.log(`📊 Pillar ${pillar}: ${pillarCompliance[pillar].compliancePercentage}% (${pillarCompliance[pillar].totalControls} controls, ${pillarCompliance[pillar].gaps} gaps)`);
      }
    });
    
    // Calculate overall compliance
    // Use weighted average based on total controls per pillar, not just simple average
    let totalComplianceWeighted = 0;
    let totalControlsAcrossPillars = 0;
    let pillarCount = 0;
    
    Object.values(pillarCompliance).forEach(pillar => {
      if (pillar.totalControls > 0) {
        totalComplianceWeighted += pillar.compliancePercentage * pillar.totalControls;
        totalControlsAcrossPillars += pillar.totalControls;
        pillarCount++;
      } else if (pillar.compliancePercentage > 0) {
        // Pillar with 100% compliance and no gaps (all Yes answers)
        totalComplianceWeighted += pillar.compliancePercentage;
        pillarCount++;
      }
    });
    
    const overallCompliance = pillarCount > 0
      ? (totalControlsAcrossPillars > 0
          ? Math.round(totalComplianceWeighted / totalControlsAcrossPillars)
          : Math.round(totalComplianceWeighted / pillarCount))
      : 0;
    
    console.log(`📊 Overall Compliance Calculation:`);
    console.log(`   Total Controls: ${totalControlsAcrossPillars}`);
    console.log(`   Pillars with controls: ${pillarCount}`);
    console.log(`   Weighted Compliance: ${overallCompliance}%`);
    console.log(`   Pillar breakdown:`, Object.entries(pillarCompliance).map(([id, p]) => 
      `${id}: ${p.compliancePercentage}% (${p.totalControls} controls, ${p.gaps} gaps)`
    ));
    
    // Calculate estimated max loss
    let estimatedMaxLoss = 0;
    
    // For each gap analysis, calculate potential loss
    filteredGapAnalyses.forEach((analysis: any) => {
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
      regulationType,
      overallCompliance,
      pillarCompliance,
      estimatedMaxLoss: Math.round(estimatedMaxLoss),
      estimatedMaxLossFormatted: formatCurrency(estimatedMaxLoss),
      totalAssets: assets.length,
      totalGapAnalyses: filteredGapAnalyses.length,
      pillars: pillars.map(p => {
        const config = getRegulationConfig(regulationType as RegulationType);
        const pillarConfig = config.pillars.find(pl => pl.id === p);
        return {
          id: p,
          name: pillarConfig?.name || p,
          nameEs: pillarConfig?.nameEs,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

