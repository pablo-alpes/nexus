/**
 * TPRM API — DORA Third-Party ICT Risk Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import ThirdPartyICTProvider, {
  calculateTPRMRiskLevel,
  calculateTPRMComplianceStatus,
  TPRM_DEMO_PROVIDERS,
} from '@/models/ThirdPartyICTProvider';
import { RegulationType } from '@/lib/regulations';

function generateProviderId(): string {
  return `TPRM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

async function ensureDemoProviders() {
  const count = await ThirdPartyICTProvider.countDocuments({ regulationType: RegulationType.DORA });
  if (count === 0) {
    for (const seed of TPRM_DEMO_PROVIDERS) {
      const riskLevel = calculateTPRMRiskLevel(seed);
      const complianceStatus = calculateTPRMComplianceStatus(seed);
      await ThirdPartyICTProvider.create({
        ...seed,
        riskLevel,
        complianceStatus,
        lastAssessmentDate: new Date(),
        nextAssessmentDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    await ensureDemoProviders();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const complianceStatus = searchParams.get('complianceStatus');
    const riskLevel = searchParams.get('riskLevel');

    const query: Record<string, string> = { regulationType: RegulationType.DORA };
    if (status) query.status = status;
    if (complianceStatus) query.complianceStatus = complianceStatus;
    if (riskLevel) query.riskLevel = riskLevel;

    const providers = await ThirdPartyICTProvider.find(query);

    const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    providers.sort((a: any, b: any) => {
      const aRisk = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 4;
      const bRisk = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 4;
      if (aRisk !== bRisk) return aRisk - bRisk;
      return a.name.localeCompare(b.name);
    });

    const summary = {
      total: providers.length,
      compliant: providers.filter((p: any) => p.complianceStatus === 'COMPLIANT').length,
      nonCompliant: providers.filter((p: any) => p.complianceStatus === 'NON_COMPLIANT').length,
      criticalRisk: providers.filter((p: any) => p.riskLevel === 'CRITICAL').length,
      concentrationRisk: providers.filter((p: any) => p.concentrationRisk).length,
    };

    return NextResponse.json({ providers, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();

    const riskLevel = calculateTPRMRiskLevel(body);
    const complianceStatus = calculateTPRMComplianceStatus(body);

    const provider = await ThirdPartyICTProvider.create({
      providerId: generateProviderId(),
      ...body,
      riskLevel,
      complianceStatus,
      regulationType: RegulationType.DORA,
      lastAssessmentDate: new Date(),
      nextAssessmentDate: body.nextAssessmentDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    return NextResponse.json({ provider }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const { providerId, ...updates } = body;

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }

    const existingByProviderId = await ThirdPartyICTProvider.findOne({ providerId });
    const existingById = existingByProviderId ? null : await ThirdPartyICTProvider.findOne({ _id: providerId });
    const existing = existingByProviderId || existingById;

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const mergedForScoring = { ...(existing as any), ...updates };
    const riskLevel = updates.riskLevel || calculateTPRMRiskLevel(mergedForScoring);
    const complianceStatus = updates.complianceStatus || calculateTPRMComplianceStatus(mergedForScoring);

    let provider = await ThirdPartyICTProvider.findOneAndUpdate(
      { providerId },
      {
        ...updates,
        riskLevel,
        complianceStatus,
        lastAssessmentDate: new Date(),
      },
      { new: true }
    );

    if (!provider) {
      provider = await ThirdPartyICTProvider.findOneAndUpdate(
        { _id: providerId },
        {
          ...updates,
          riskLevel,
          complianceStatus,
          lastAssessmentDate: new Date(),
        },
        { new: true }
      );
    }

    return NextResponse.json({ provider });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
