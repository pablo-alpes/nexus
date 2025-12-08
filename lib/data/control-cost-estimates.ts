// Cost estimation data for control implementation
// Based on control type, asset type, and complexity

export interface CostEstimate {
  min: number; // Minimum cost in EUR
  max: number; // Maximum cost in EUR
  avg: number; // Average cost in EUR
  effort: 'LOW' | 'MEDIUM' | 'HIGH'; // Implementation effort
  duration: string; // Estimated duration (e.g., "2-4 weeks")
}

export const CONTROL_COST_ESTIMATES: Record<string, Record<string, CostEstimate>> = {
  // Transversal controls (apply to all assets)
  TRANSVERSAL: {
    POLICY: {
      min: 5000,
      max: 20000,
      avg: 10000,
      effort: 'MEDIUM',
      duration: '2-4 weeks',
    },
    PROCEDURE: {
      min: 3000,
      max: 15000,
      avg: 8000,
      effort: 'MEDIUM',
      duration: '2-3 weeks',
    },
    FRAMEWORK: {
      min: 20000,
      max: 80000,
      avg: 40000,
      effort: 'HIGH',
      duration: '2-3 months',
    },
    TRAINING: {
      min: 2000,
      max: 10000,
      avg: 5000,
      effort: 'LOW',
      duration: '1-2 weeks',
    },
    MONITORING: {
      min: 10000,
      max: 50000,
      avg: 25000,
      effort: 'HIGH',
      duration: '1-2 months',
    },
    DEFAULT: {
      min: 5000,
      max: 30000,
      avg: 15000,
      effort: 'MEDIUM',
      duration: '3-6 weeks',
    },
  },
  // Specific controls (apply to specific asset types)
  SPECIFIC: {
    DATABASE: {
      min: 10000,
      max: 50000,
      avg: 25000,
      effort: 'HIGH',
      duration: '1-2 months',
    },
    APPLICATION: {
      min: 15000,
      max: 60000,
      avg: 30000,
      effort: 'HIGH',
      duration: '1-3 months',
    },
    NETWORK: {
      min: 8000,
      max: 40000,
      avg: 20000,
      effort: 'MEDIUM',
      duration: '3-8 weeks',
    },
    INFRASTRUCTURE: {
      min: 12000,
      max: 80000,
      avg: 40000,
      effort: 'HIGH',
      duration: '2-4 months',
    },
    THIRD_PARTY_SERVICE: {
      min: 5000,
      max: 30000,
      avg: 15000,
      effort: 'MEDIUM',
      duration: '4-8 weeks',
    },
    DATA_STORAGE: {
      min: 10000,
      max: 50000,
      avg: 25000,
      effort: 'HIGH',
      duration: '1-2 months',
    },
    SECURITY_TOOL: {
      min: 15000,
      max: 100000,
      avg: 50000,
      effort: 'HIGH',
      duration: '2-3 months',
    },
    DEFAULT: {
      min: 8000,
      max: 40000,
      avg: 20000,
      effort: 'MEDIUM',
      duration: '4-8 weeks',
    },
  },
};

// Priority-based cost multipliers
export const PRIORITY_COST_MULTIPLIERS: Record<string, number> = {
  CRITICAL: 1.2, // 20% premium for critical items
  HIGH: 1.1,     // 10% premium
  MEDIUM: 1.0,   // Base cost
  LOW: 0.9,      // 10% discount (can take more time)
};

// Criticality-based cost multipliers
export const CRITICALITY_COST_MULTIPLIERS: Record<number, number> = {
  4: 1.5, // Critical assets: 50% premium
  3: 1.2, // High criticality: 20% premium
  2: 1.0, // Medium: base cost
  1: 0.8, // Low: 20% discount
};

/**
 * Estimate cost for implementing a control
 */
export function estimateControlCost(
  controlType: 'TRANSVERSAL' | 'SPECIFIC',
  assetType?: string,
  priority: string = 'MEDIUM',
  maxCriticality: number = 2
): CostEstimate {
  const typeEstimates = CONTROL_COST_ESTIMATES[controlType] || {};
  const estimate = typeEstimates[assetType || 'DEFAULT'] || typeEstimates['DEFAULT'] || {
    min: 5000,
    max: 30000,
    avg: 15000,
    effort: 'MEDIUM',
    duration: '4-8 weeks',
  };

  // Apply multipliers
  const priorityMultiplier = PRIORITY_COST_MULTIPLIERS[priority] || 1.0;
  const criticalityMultiplier = CRITICALITY_COST_MULTIPLIERS[maxCriticality] || 1.0;
  const totalMultiplier = priorityMultiplier * criticalityMultiplier;

  return {
    min: Math.round(estimate.min * totalMultiplier),
    max: Math.round(estimate.max * totalMultiplier),
    avg: Math.round(estimate.avg * totalMultiplier),
    effort: estimate.effort,
    duration: estimate.duration,
  };
}

