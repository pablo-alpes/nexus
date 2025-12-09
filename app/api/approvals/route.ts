import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import ApprovalWorkflow, { ApprovalStatus, ChangeType } from '@/models/ApprovalWorkflow';
import { getAuthUserContext } from '@/lib/auth-helper';
import { UserRole } from '@/models/Organization';
import { canApproveChanges } from '@/lib/permissions';

/**
 * GET /api/approvals
 * Get pending approvals based on user role
 */
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ApprovalStatus | null;
    const affiliateId = searchParams.get('affiliateId');

    let query: any = {};

    // SuperAdmin sees all approvals in their organization
    if (userContext.role === UserRole.SUPER_ADMIN) {
      if (userContext.organizationId) {
        query.organizationId = userContext.organizationId;
      }
    } else if (userContext.role === UserRole.ADMIN) {
      // Admin sees approvals for their affiliate
      if (userContext.affiliateId) {
        query.affiliateId = userContext.affiliateId;
      }
    } else {
      // User sees only their own requests
      query.requestedBy = userContext.userId;
    }

    if (status) {
      query.status = status;
    }

    if (affiliateId) {
      query.affiliateId = affiliateId;
    }

    const approvals = await ApprovalWorkflow.find(query)
      .sort({ requestedAt: -1 })
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email');

    return NextResponse.json({ approvals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/approvals
 * Create a new approval request
 */
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userContext.affiliateId || !userContext.organizationId) {
      return NextResponse.json({ error: 'User must be assigned to an affiliate' }, { status: 400 });
    }

    const body = await request.json();
    const { changeType, entityId, entityType, changeDetails, comments } = body;

    if (!changeType || !entityId || !entityType) {
      return NextResponse.json({ error: 'changeType, entityId, and entityType are required' }, { status: 400 });
    }

    const workflowId = `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Use create() for LocalModel compatibility
    const approval = await ApprovalWorkflow.create({
      workflowId,
      changeType,
      entityId,
      entityType,
      affiliateId: userContext.affiliateId,
      organizationId: userContext.organizationId,
      requestedBy: userContext.userId,
      status: ApprovalStatus.PENDING,
      changeDetails: changeDetails || [],
      comments,
    });

    return NextResponse.json({ approval }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/approvals
 * Approve or reject an approval request
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId, action, comments } = body; // action: 'approve' or 'reject'

    if (!workflowId || !action) {
      return NextResponse.json({ error: 'workflowId and action are required' }, { status: 400 });
    }

    const approval = await ApprovalWorkflow.findOne({ workflowId });
    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    // Check if user can approve
    const canApprove = canApproveChanges(userContext, approval.affiliateId.toString());
    if (!canApprove.allowed) {
      return NextResponse.json({ error: canApprove.reason }, { status: 403 });
    }

    // Check if already processed
    if (approval.status !== ApprovalStatus.PENDING) {
      return NextResponse.json({ error: 'Approval already processed' }, { status: 400 });
    }

    const updateData: any = {};
    
    if (action === 'approve') {
      updateData.status = ApprovalStatus.APPROVED;
      updateData.approvedBy = userContext.userId;
      updateData.approvedAt = new Date();
    } else if (action === 'reject') {
      updateData.status = ApprovalStatus.REJECTED;
      updateData.rejectedBy = userContext.userId;
      updateData.rejectedAt = new Date();
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject"' }, { status: 400 });
    }

    if (comments) {
      updateData.comments = comments;
    }

    // Use findOneAndUpdate for LocalModel compatibility
    const updatedApproval = await ApprovalWorkflow.findOneAndUpdate(
      { workflowId },
      updateData,
      { new: true }
    );

    if (!updatedApproval) {
      return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
    }

    return NextResponse.json({ approval: updatedApproval });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

