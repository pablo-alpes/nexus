import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import Control, { getControlModel } from '@/models/Control';
import { getAuthUser } from '@/lib/auth-helper';
import { RegulationType } from '@/lib/regulations';

// PUT - Update compliance status for a control
export async function PUT(
  request: NextRequest,
  { params }: { params: { controlId: string } }
) {
  try {
    await connectDBLocal();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { complianceStatus, notes, regulation } = body;
    const regulationType = regulation || RegulationType.DORA;
    const ControlModel = isLocalStorage() ? getControlModel(regulationType) : Control;
    
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
    
    let control = await ControlModel.findOneAndUpdate(
      { controlId: params.controlId },
      {
        complianceStatus,
        notes: notes || undefined,
      },
      { new: true }
    );
    
    if (!control) {
      control = await ControlModel.findOneAndUpdate(
        { _id: params.controlId },
        { complianceStatus, notes: notes || undefined },
        { new: true }
      );
    }

    if (!control) {
      return NextResponse.json(
        { error: 'Control not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      control,
      message: 'Compliance status updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

