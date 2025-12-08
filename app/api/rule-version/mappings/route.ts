import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import QuestionMapping from '@/models/QuestionMapping';
import { getActiveRuleVersion } from '@/lib/services/precomputed-mappings';

// GET: list mappings for current rule version
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const ruleVersion = await getActiveRuleVersion();
    // Support both mongoose and LocalModel (no .lean() in LocalModel)
    const raw = await QuestionMapping.find({ ruleVersion });
    const mappings = Array.isArray(raw) ? raw : [];
    return NextResponse.json({ ruleVersion, mappings });
  } catch (error: any) {
    console.error('Error fetching mappings:', error);
    // Fallback to avoid breaking UI; return empty set with warning
    return NextResponse.json({ ruleVersion: 'unknown', mappings: [], warning: error.message });
  }
}

// PUT: update controlBasedRequirements for a question mapping
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const { questionId, controlBasedRequirements, ruleVersion } = body;

    if (!questionId || !controlBasedRequirements) {
      return NextResponse.json({ error: 'questionId and controlBasedRequirements are required' }, { status: 400 });
    }

    const version = ruleVersion || await getActiveRuleVersion();

    const updated = await QuestionMapping.findOneAndUpdate(
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

