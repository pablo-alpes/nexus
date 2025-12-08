import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import RuleVersion from '@/models/RuleVersion';
import { getCurrentRuleVersion, getActiveRuleVersion, getOverallCoherenceMetrics } from '@/lib/services/precomputed-mappings';

// GET - Get current rule version and coherence metrics
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const ruleVersion = await getActiveRuleVersion();
    const ruleVersionDoc = await RuleVersion.findOne({ version: ruleVersion });
    const metrics = await getOverallCoherenceMetrics(ruleVersion);
    
    return NextResponse.json({
      ruleVersion: {
        version: ruleVersion,
        isoControlsVersion: ruleVersionDoc?.isoControlsVersion || ruleVersion,
        status: ruleVersionDoc?.status || 'PENDING',
        effectiveDate: ruleVersionDoc?.effectiveDate || new Date(),
        precomputedAt: ruleVersionDoc?.precomputedAt,
        metadata: ruleVersionDoc?.metadata,
      },
      coherenceMetrics: metrics,
    });
  } catch (error: any) {
    console.error('Error fetching rule version:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

