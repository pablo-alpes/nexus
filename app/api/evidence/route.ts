import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Evidence from '@/models/Evidence';
import { verifyToken } from '@/lib/auth';

// GET all evidence for user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = verifyToken(token);
    const searchParams = request.nextUrl.searchParams;
    const controlId = searchParams.get('controlId');
    const remediationActionId = searchParams.get('remediationActionId');
    
    const query: any = { userId: payload.userId };
    if (controlId) query.controlId = controlId;
    if (remediationActionId) query.remediationActionId = remediationActionId;
    
    const evidence = await Evidence.find(query)
      .populate('controlId')
      .sort({ uploadedAt: -1 });
    
    return NextResponse.json({ evidence });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

