import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DORARequirement from '@/models/DORARequirement';
import { getAuthUser } from '@/lib/auth-helper';

// PUT - Update compliance status for a requirement
export async function PUT(
  request: NextRequest,
  { params }: { params: { requirementId: string } }
) {
  try {
    await connectDBLocal();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { complianceStatus, notes } = body;
    
    if (!complianceStatus) {
      return NextResponse.json(
        { error: 'complianceStatus is required' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['NOT_APPLICABLE', 'FULLY_COMPLIANT', 'PARTIALLY_COMPLIANT', 'NOT_COMPLIANT'];
    if (!validStatuses.includes(complianceStatus)) {
      return NextResponse.json(
        { error: 'Invalid compliance status' },
        { status: 400 }
      );
    }
    
    const requirement = await DORARequirement.findOneAndUpdate(
      { requirementId: params.requirementId },
      {
        complianceStatus,
        notes: notes || undefined,
      },
      { new: true }
    );
    
    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      requirement,
      message: 'Compliance status updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

