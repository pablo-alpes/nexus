import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import Evidence from '@/models/Evidence';
import { getAuthUserContext } from '@/lib/auth-helper';
import { extractFilterParams, buildDataQuery } from '@/lib/query-helpers';

// GET evidence for current tenant scope (cabinet → client)
export async function GET(request: NextRequest) {
  try {
    if (isLocalStorage()) {
      await connectDBLocal();
    } else {
      await connectDB();
    }

    const ctx = await getAuthUserContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filterParams = extractFilterParams(request);
    const { query } = await buildDataQuery(ctx, filterParams);

    const searchParams = request.nextUrl.searchParams;
    const controlId = searchParams.get('controlId');
    const remediationActionId = searchParams.get('remediationActionId');
    const article = searchParams.get('article');
    const requirementId = searchParams.get('requirementId');

    if (controlId) query.controlId = controlId;
    if (remediationActionId) query.remediationActionId = remediationActionId;
    if (article) query.article = article;
    if (requirementId) query.requirementId = requirementId;

    let evidence = await Evidence.find(query);

    // Sort by uploadedAt desc when possible
    evidence = (evidence || []).sort((a: any, b: any) => {
      const aT = new Date(a.uploadedAt || a.createdAt || 0).getTime();
      const bT = new Date(b.uploadedAt || b.createdAt || 0).getTime();
      return bT - aT;
    });

    return NextResponse.json({ evidence });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
