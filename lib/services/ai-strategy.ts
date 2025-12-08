import { estimateControlCost } from '@/lib/data/control-cost-estimates';
import { DORAPillar } from '@/models/DORARequirement';

export interface InvestmentBreakdown {
  pillar: string;
  estimatedCost: number;
  priority: string;
  roi: number;
  actionCount: number;
}

export interface Phase {
  phase: number;
  name: string;
  duration: string;
  actions: string[];
  investment: number;
  riskReduction: number;
  description: string;
}

export interface ResourceAllocation {
  team: string;
  estimatedHours: number;
  controls: string[];
  cost: number;
}

export interface StrategicRecommendation {
  overview: string;
  totalInvestment: number;
  investmentBreakdown: InvestmentBreakdown[];
  phasedApproach: Phase[];
  quickWins: string[];
  resourceAllocation: ResourceAllocation[];
  keyRecommendations: string[];
  riskReduction: number;
  estimatedMaxLossReduction: number;
}

interface RemediationAction {
  controlId: string;
  action: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  applicableAssets: Array<{
    assetId: string;
    name: string;
    criticalityLevel: number;
    assetType?: string;
  }>;
  controlTitle: string;
  controlDescription?: string;
  controlType?: 'TRANSVERSAL' | 'SPECIFIC';
}

interface GapAnalysis {
  gaps: Array<{
    controlId: string;
    priority: string;
    status: string;
    gapDescription: string;
  }>;
  compliancePercentage: number;
  totalControls: number;
}

interface Asset {
  assetId: string;
  name: string;
  assetType: string;
  criticalityLevel: number;
}

interface KPIData {
  estimatedMaxLoss: number;
  estimatedMaxLossFormatted: string;
  overallCompliance: number;
}

/**
 * Generate AI-powered strategic recommendations for remediation
 */
export async function generateAIStrategy(
  actions: RemediationAction[],
  gapAnalysis: GapAnalysis,
  assets: Asset[],
  kpis: KPIData,
  pillar: DORAPillar
): Promise<StrategicRecommendation> {
  // Calculate cost estimates for each action
  const actionCosts = actions.map(action => {
    const maxCriticality = action.applicableAssets.length > 0
      ? Math.max(...action.applicableAssets.map(a => a.criticalityLevel))
      : 2;
    
    const assetType = action.applicableAssets.length > 0 && action.applicableAssets[0].assetType
      ? action.applicableAssets[0].assetType
      : undefined;
    
    // Determine control type - check if we have control data with controlType
    // Otherwise infer from description or default to SPECIFIC
    let controlType: 'TRANSVERSAL' | 'SPECIFIC' = 'SPECIFIC';
    
    // Try to get control type from action if available
    if ((action as any).controlType) {
      controlType = (action as any).controlType;
    } else if (action.controlDescription?.toLowerCase().includes('policy') ||
               action.controlDescription?.toLowerCase().includes('framework') ||
               action.controlDescription?.toLowerCase().includes('procedure') ||
               action.controlTitle?.toLowerCase().includes('policy') ||
               action.controlTitle?.toLowerCase().includes('framework')) {
      controlType = 'TRANSVERSAL';
    }
    
    const costEstimate = estimateControlCost(
      controlType,
      assetType,
      action.priority,
      maxCriticality
    );
    
    return {
      action,
      cost: costEstimate.avg,
      minCost: costEstimate.min,
      maxCost: costEstimate.max,
      effort: costEstimate.effort,
      duration: costEstimate.duration,
      maxCriticality,
    };
  });

  // Calculate total investment
  const totalInvestment = actionCosts.reduce((sum, ac) => sum + ac.cost, 0);

  // Calculate investment breakdown by pillar (for multi-pillar view)
  const investmentBreakdown: InvestmentBreakdown[] = [
    {
      pillar: pillar.replace(/_/g, ' '),
      estimatedCost: totalInvestment,
      priority: getHighestPriority(actions),
      roi: calculateROI(totalInvestment, kpis.estimatedMaxLoss),
      actionCount: actions.length,
    },
  ];

  // Identify quick wins (high ROI, low effort, low cost)
  const quickWins = actionCosts
    .filter(ac => ac.effort === 'LOW' && ac.cost < 20000)
    .sort((a, b) => {
      // Sort by priority first, then cost
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = (priorityOrder[a.action.priority as keyof typeof priorityOrder] || 0) -
                          (priorityOrder[b.action.priority as keyof typeof priorityOrder] || 0);
      if (priorityDiff !== 0) return -priorityDiff;
      return a.cost - b.cost;
    })
    .slice(0, 5)
    .map(ac => `${ac.action.controlTitle} (€${formatCurrency(ac.cost)}, ${ac.duration}, ${ac.effort} effort)`);

  // Create phased approach
  const phasedApproach = createPhasedApproach(actionCosts, kpis);

  // Calculate resource allocation
  const resourceAllocation = calculateResourceAllocation(actionCosts);

  // Generate key recommendations
  const keyRecommendations = generateKeyRecommendations(
    actions,
    gapAnalysis,
    kpis,
    actionCosts,
    quickWins
  );

  // Calculate risk reduction
  const riskReduction = calculateRiskReduction(actions, gapAnalysis);
  const estimatedMaxLossReduction = kpis.estimatedMaxLoss * (riskReduction / 100);

  // Generate overview
  const overview = generateOverview(
    actions,
    gapAnalysis,
    kpis,
    totalInvestment,
    riskReduction
  );

  return {
    overview,
    totalInvestment,
    investmentBreakdown,
    phasedApproach,
    quickWins,
    resourceAllocation,
    keyRecommendations,
    riskReduction,
    estimatedMaxLossReduction,
  };
}

/**
 * Create phased approach for remediation
 */
function createPhasedApproach(
  actionCosts: Array<{
    action: RemediationAction;
    cost: number;
    effort: string;
    duration: string;
    maxCriticality: number;
  }>,
  kpis: KPIData
): Phase[] {
  // Phase 1: Quick Wins (low effort, high priority, reasonable cost)
  const quickWinActions = actionCosts
    .filter(ac => ac.effort === 'LOW' || (ac.action.priority === 'CRITICAL' && ac.cost < 30000))
    .sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (priorityOrder[b.action.priority as keyof typeof priorityOrder] || 0) -
             (priorityOrder[a.action.priority as keyof typeof priorityOrder] || 0);
    })
    .slice(0, Math.min(5, Math.ceil(actionCosts.length * 0.3)));

  // Phase 2: Critical Gaps (high priority, regardless of effort)
  const criticalActions = actionCosts
    .filter(ac => ac.action.priority === 'CRITICAL' && !quickWinActions.includes(ac))
    .sort((a, b) => b.maxCriticality - a.maxCriticality)
    .slice(0, Math.min(8, Math.ceil(actionCosts.length * 0.4)));

  // Phase 3: Remaining items
  const remainingActions = actionCosts
    .filter(ac => !quickWinActions.includes(ac) && !criticalActions.includes(ac))
    .sort((a, b) => a.cost - b.cost);

  const phases: Phase[] = [];

  if (quickWinActions.length > 0) {
    phases.push({
      phase: 1,
      name: 'Quick Wins & Foundation',
      duration: '1-2 months',
      actions: quickWinActions.map(ac => ac.action.controlTitle),
      investment: quickWinActions.reduce((sum, ac) => sum + ac.cost, 0),
      riskReduction: calculatePhaseRiskReduction(quickWinActions, actionCosts),
      description: 'Focus on low-effort, high-impact controls to build momentum and demonstrate quick progress.',
    });
  }

  if (criticalActions.length > 0) {
    phases.push({
      phase: 2,
      name: 'Critical Gaps & High Priority',
      duration: '2-4 months',
      actions: criticalActions.map(ac => ac.action.controlTitle),
      investment: criticalActions.reduce((sum, ac) => sum + ac.cost, 0),
      riskReduction: calculatePhaseRiskReduction(criticalActions, actionCosts),
      description: 'Address critical gaps affecting high-criticality assets to significantly reduce risk exposure.',
    });
  }

  if (remainingActions.length > 0) {
    phases.push({
      phase: 3,
      name: 'Remaining Controls & Optimization',
      duration: '3-6 months',
      actions: remainingActions.map(ac => ac.action.controlTitle),
      investment: remainingActions.reduce((sum, ac) => sum + ac.cost, 0),
      riskReduction: calculatePhaseRiskReduction(remainingActions, actionCosts),
      description: 'Complete remaining controls and optimize existing implementations for long-term compliance.',
    });
  }

  return phases;
}

/**
 * Calculate resource allocation
 */
function calculateResourceAllocation(
  actionCosts: Array<{
    action: RemediationAction;
    cost: number;
    effort: string;
    duration: string;
  }>
): ResourceAllocation[] {
  // Estimate hours based on cost (€100/hour average rate)
  const hourlyRate = 100;
  
  const allocations: ResourceAllocation[] = [
    {
      team: 'Security Team',
      estimatedHours: Math.round(actionCosts.filter(ac => 
        ac.action.controlTitle?.toLowerCase().includes('security') ||
        ac.action.controlTitle?.toLowerCase().includes('access') ||
        ac.action.controlTitle?.toLowerCase().includes('encryption')
      ).reduce((sum, ac) => sum + ac.cost, 0) / hourlyRate),
      controls: actionCosts
        .filter(ac => ac.action.controlTitle?.toLowerCase().includes('security'))
        .map(ac => ac.action.controlTitle),
      cost: actionCosts
        .filter(ac => ac.action.controlTitle?.toLowerCase().includes('security'))
        .reduce((sum, ac) => sum + ac.cost, 0),
    },
    {
      team: 'Risk Management',
      estimatedHours: Math.round(actionCosts.filter(ac =>
        ac.action.controlTitle?.toLowerCase().includes('risk') ||
        ac.action.controlTitle?.toLowerCase().includes('assessment')
      ).reduce((sum, ac) => sum + ac.cost, 0) / hourlyRate),
      controls: actionCosts
        .filter(ac => ac.action.controlTitle?.toLowerCase().includes('risk'))
        .map(ac => ac.action.controlTitle),
      cost: actionCosts
        .filter(ac => ac.action.controlTitle?.toLowerCase().includes('risk'))
        .reduce((sum, ac) => sum + ac.cost, 0),
    },
    {
      team: 'IT Operations',
      estimatedHours: Math.round(actionCosts.filter(ac =>
        ac.action.controlTitle?.toLowerCase().includes('infrastructure') ||
        ac.action.controlTitle?.toLowerCase().includes('network') ||
        ac.action.controlTitle?.toLowerCase().includes('monitoring')
      ).reduce((sum, ac) => sum + ac.cost, 0) / hourlyRate),
      controls: actionCosts
        .filter(ac => ac.action.controlTitle?.toLowerCase().includes('infrastructure'))
        .map(ac => ac.action.controlTitle),
      cost: actionCosts
        .filter(ac => ac.action.controlTitle?.toLowerCase().includes('infrastructure'))
        .reduce((sum, ac) => sum + ac.cost, 0),
    },
  ].filter(alloc => alloc.estimatedHours > 0);

  // Add general team if there are remaining controls
  const allocatedControls = new Set(
    allocations.flatMap(alloc => alloc.controls)
  );
  const remainingActions = actionCosts.filter(
    ac => !allocatedControls.has(ac.action.controlTitle)
  );

  if (remainingActions.length > 0) {
    allocations.push({
      team: 'Compliance Team',
      estimatedHours: Math.round(remainingActions.reduce((sum, ac) => sum + ac.cost, 0) / hourlyRate),
      controls: remainingActions.map(ac => ac.action.controlTitle),
      cost: remainingActions.reduce((sum, ac) => sum + ac.cost, 0),
    });
  }

  return allocations;
}

/**
 * Generate key recommendations
 */
function generateKeyRecommendations(
  actions: RemediationAction[],
  gapAnalysis: GapAnalysis,
  kpis: KPIData,
  actionCosts: Array<{ action: RemediationAction; cost: number }>,
  quickWins: string[]
): string[] {
  const recommendations: string[] = [];

  // Priority-based recommendation
  const criticalCount = actions.filter(a => a.priority === 'CRITICAL').length;
  if (criticalCount > 0) {
    recommendations.push(
      `Prioritize ${criticalCount} critical gaps first - these represent the highest risk exposure (€${kpis.estimatedMaxLossFormatted} potential loss)`
    );
  }

  // Quick wins recommendation
  if (quickWins.length > 0) {
    recommendations.push(
      `Start with ${quickWins.length} quick wins to build momentum and demonstrate early progress`
    );
  }

  // Cost optimization
  const avgCost = actionCosts.reduce((sum, ac) => sum + ac.cost, 0) / actionCosts.length;
  const highCostActions = actionCosts.filter(ac => ac.cost > avgCost * 1.5);
  if (highCostActions.length > 0) {
    recommendations.push(
      `Consider phasing ${highCostActions.length} high-cost implementations (€${formatCurrency(highCostActions.reduce((sum, ac) => sum + ac.cost, 0))}) over multiple quarters`
    );
  }

  // Compliance target
  const targetCompliance = 80;
  if (gapAnalysis.compliancePercentage < targetCompliance) {
    const gap = targetCompliance - gapAnalysis.compliancePercentage;
    recommendations.push(
      `Focus on achieving ${targetCompliance}% compliance (currently ${gapAnalysis.compliancePercentage}%, ${gap}% gap remaining)`
    );
  }

  // Resource allocation
  recommendations.push(
    `Allocate resources based on priority and criticality - focus on controls affecting Level 3-4 assets first`
  );

  return recommendations.slice(0, 5);
}

/**
 * Calculate ROI
 */
function calculateROI(investment: number, potentialLoss: number): number {
  if (investment === 0) return 0;
  // ROI = (Risk Reduction Value - Investment) / Investment
  // Assuming 50% risk reduction on average
  const riskReductionValue = potentialLoss * 0.5;
  return Math.round(((riskReductionValue - investment) / investment) * 100) / 100;
}

/**
 * Calculate risk reduction percentage
 */
function calculateRiskReduction(
  actions: RemediationAction[],
  gapAnalysis: GapAnalysis
): number {
  // Base risk reduction on priority distribution
  const priorityWeights = { CRITICAL: 0.4, HIGH: 0.3, MEDIUM: 0.2, LOW: 0.1 };
  const totalWeight = actions.reduce(
    (sum, a) => sum + (priorityWeights[a.priority as keyof typeof priorityWeights] || 0),
    0
  );
  
  // Normalize to percentage (assuming full implementation reduces risk by 60-80%)
  const baseReduction = 70; // 70% average risk reduction
  return Math.min(100, Math.round(totalWeight * baseReduction));
}

/**
 * Calculate phase risk reduction
 */
function calculatePhaseRiskReduction(
  phaseActions: Array<{ action: RemediationAction; cost: number }>,
  allActions: Array<{ action: RemediationAction; cost: number }>
): number {
  if (allActions.length === 0) return 0;
  const phasePriority = phaseActions.reduce(
    (sum, ac) => sum + (ac.action.priority === 'CRITICAL' ? 4 : ac.action.priority === 'HIGH' ? 3 : ac.action.priority === 'MEDIUM' ? 2 : 1),
    0
  );
  const totalPriority = allActions.reduce(
    (sum, ac) => sum + (ac.action.priority === 'CRITICAL' ? 4 : ac.action.priority === 'HIGH' ? 3 : ac.action.priority === 'MEDIUM' ? 2 : 1),
    0
  );
  return Math.round((phasePriority / totalPriority) * 100);
}

/**
 * Generate overview text
 */
function generateOverview(
  actions: RemediationAction[],
  gapAnalysis: GapAnalysis,
  kpis: KPIData,
  totalInvestment: number,
  riskReduction: number
): string {
  const criticalCount = actions.filter(a => a.priority === 'CRITICAL').length;
  const highCount = actions.filter(a => a.priority === 'HIGH').length;
  
  return `Based on your gap analysis, you have ${actions.length} remediation actions identified across the ${gapAnalysis.totalControls} controls analyzed. ` +
    `Your current compliance is ${gapAnalysis.compliancePercentage}%, with ${criticalCount} critical and ${highCount} high-priority gaps. ` +
    `The estimated total investment is €${formatCurrency(totalInvestment)}, which can reduce your risk exposure by approximately ${riskReduction}% ` +
    `(reducing potential losses from ${kpis.estimatedMaxLossFormatted} to approximately €${formatCurrency(kpis.estimatedMaxLoss * (1 - riskReduction / 100))}). ` +
    `We recommend a phased approach starting with quick wins to build momentum, followed by critical gaps, and then completing remaining controls.`;
}

/**
 * Helper functions
 */
function getHighestPriority(actions: RemediationAction[]): string {
  if (actions.some(a => a.priority === 'CRITICAL')) return 'CRITICAL';
  if (actions.some(a => a.priority === 'HIGH')) return 'HIGH';
  if (actions.some(a => a.priority === 'MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toFixed(0);
}

