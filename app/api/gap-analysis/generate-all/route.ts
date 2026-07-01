import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import { getAuthUser } from '@/lib/auth-helper';
import { RegulationType } from '@/lib/regulations';
import { getPillarIds } from '@/lib/compliance-engine';

/**
 * POST - Generate gap analysis for all pillars of a regulation (used after questionnaire submit).
 */
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();

    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const regulationType = body.regulation || RegulationType.DORA;
    const pillars = getPillarIds(regulationType as RegulationType);

    const baseUrl = request.nextUrl.origin;
    const cookie = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';

    const results: Array<{ pillar: string; compliancePercentage: number; gaps: number }> = [];

    for (const pillar of pillars) {
      const response = await fetch(`${baseUrl}/api/gap-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { cookie } : {}),
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        body: JSON.stringify({ pillar, regulation: regulationType }),
      });

      if (response.ok) {
        const data = await response.json();
        results.push({
          pillar,
          compliancePercentage: data.summary?.compliancePercentage ?? 0,
          gaps: data.summary?.gaps ?? 0,
        });
      } else {
        const err = await response.json().catch(() => ({}));
        results.push({ pillar, compliancePercentage: 0, gaps: 0 });
        console.warn(`Gap analysis failed for ${pillar}:`, err.error || response.status);
      }
    }

    const overallCompliance =
      results.length > 0
        ? Math.round(
            results.reduce((sum, r) => sum + r.compliancePercentage, 0) / results.length
          )
        : 0;

    return NextResponse.json({
      success: true,
      regulationType,
      overallCompliance,
      pillarResults: results,
    });
  } catch (error: any) {
    console.error('Generate-all gap analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
