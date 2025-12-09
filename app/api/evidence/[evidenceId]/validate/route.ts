import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Evidence from '@/models/Evidence';
import { getAuthUserContext } from '@/lib/auth-helper';
import { canValidateEvidence } from '@/lib/permissions';

/**
 * PUT /api/evidence/[evidenceId]/validate
 * Validate or reject evidence (requires permission)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { evidenceId: string } }
) {
  try {
    await connectDBLocal();
    
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check validation permission
    const permissionCheck = canValidateEvidence(userContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || 'Access denied',
        requiresPermission: 'canValidateEvidence'
      }, { status: 403 });
    }

    const body = await request.json();
    const { validated, comments } = body;

    if (typeof validated !== 'boolean') {
      return NextResponse.json({ error: 'validated (boolean) is required' }, { status: 400 });
    }

    const evidence = await Evidence.findOne({ evidenceId: params.evidenceId });
    
    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    // Check if user can access this evidence's affiliate
    // Note: Evidence should have affiliateId stored, but for now we check by userId
    // TODO: Add affiliateId to Evidence model

    evidence.validated = validated;
    evidence.validatedAt = new Date();
    evidence.validatedBy = userContext.userId;
    evidence.validationComments = comments;

    await evidence.save();

    return NextResponse.json({ 
      evidence,
      message: validated ? 'Evidence validated successfully' : 'Evidence rejected'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

