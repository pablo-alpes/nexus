import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Evidence from '@/models/Evidence';
import { getAuthUserContext } from '@/lib/auth-helper';
import { buildDataQuery, extractFilterParams } from '@/lib/query-helpers';

// GET all evidence for user
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const filterParams = extractFilterParams(request);
    const { query } = await buildDataQuery(userContext, filterParams);
    
    const searchParams = request.nextUrl.searchParams;
    const controlId = searchParams.get('controlId');
    const remediationActionId = searchParams.get('remediationActionId');
    
    if (controlId) query.controlId = controlId;
    if (remediationActionId) query.remediationActionId = remediationActionId;
    
    // Local storage doesn't support populate
    const evidence = await Evidence.find(query).sort({ uploadedAt: -1 });
    
    return NextResponse.json({ evidence });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

