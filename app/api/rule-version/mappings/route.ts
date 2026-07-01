import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import QuestionMapping, { getQuestionMappingModel } from '@/models/QuestionMapping';
import { getActiveRuleVersion } from '@/lib/services/precomputed-mappings';
import { RegulationType } from '@/lib/regulations';

export const dynamic = 'force-dynamic';

// GET: list mappings for current rule version - scoped by regulation for separate DORA vs Chilean Privacy data
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const { searchParams } = new URL(request.url);
    const regulationParam = searchParams.get('regulation');
    const regulationType = regulationParam === 'CHILEAN_PRIVACY' 
      ? RegulationType.CHILEAN_PRIVACY 
      : RegulationType.DORA;
    
    const ruleVersion = await getActiveRuleVersion(regulationType);
    
    // Use regulation-scoped model for local storage (separate file per regulation)
    const MappingModel = isLocalStorage() ? getQuestionMappingModel(regulationType) : QuestionMapping;
    const raw = await MappingModel.find({ ruleVersion });
    const mappings = Array.isArray(raw) ? raw : [];
    
    // For MongoDB, filter by questionId prefix when documents are mixed
    let filteredMappings = mappings;
    if (!isLocalStorage()) {
      if (regulationType === RegulationType.CHILEAN_PRIVACY) {
        filteredMappings = mappings.filter((m: any) => m.questionId?.startsWith('Q-PRIV-'));
      } else {
        filteredMappings = mappings.filter((m: any) =>
          m.questionId?.startsWith('Q-') && !m.questionId?.startsWith('Q-PRIV-')
        );
      }
    }
    
    return NextResponse.json({ ruleVersion, mappings: filteredMappings });
  } catch (error: any) {
    console.error('Error fetching mappings:', error);
    // Fallback to avoid breaking UI; return empty set with warning
    return NextResponse.json({ ruleVersion: 'unknown', mappings: [], warning: error.message });
  }
}

// PUT: update controlBasedRequirements for a question mapping (regulation from body/query for storage scope)
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const regulationFromUrl = request.nextUrl.searchParams.get('regulation');
    const { questionId, controlBasedRequirements, ruleVersion, regulation } = body;
    const regulationType = (regulation || regulationFromUrl) === 'CHILEAN_PRIVACY' ? RegulationType.CHILEAN_PRIVACY : RegulationType.DORA;
    const MappingModel = isLocalStorage() ? getQuestionMappingModel(regulationType) : QuestionMapping;

    if (!questionId || !controlBasedRequirements) {
      return NextResponse.json({ error: 'questionId and controlBasedRequirements are required' }, { status: 400 });
    }

    const version = ruleVersion || await getActiveRuleVersion(regulationType);

    const updated = await MappingModel.findOneAndUpdate(
      { questionId, ruleVersion: version },
      { controlBasedRequirements, computedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    return NextResponse.json({ ruleVersion: version, mapping: updated });
  } catch (error: any) {
    console.error('Error updating mapping:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

