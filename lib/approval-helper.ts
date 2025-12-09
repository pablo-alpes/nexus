/**
 * Helper functions for creating and managing approval workflows
 */

import ApprovalWorkflow, { ChangeType, ApprovalStatus } from '@/models/ApprovalWorkflow';
import { UserContext, requiresApproval } from './permissions';

export interface ChangeDetail {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Create an approval workflow if needed
 */
export async function createApprovalIfNeeded(
  userContext: UserContext,
  changeType: ChangeType,
  entityId: string,
  entityType: string,
  changeDetails: ChangeDetail[],
  comments?: string
): Promise<ApprovalWorkflow | null> {
  // Check if approval is needed
  if (!requiresApproval(changeType, userContext)) {
    return null; // No approval needed
  }

  if (!userContext.affiliateId || !userContext.organizationId) {
    throw new Error('User must be assigned to an affiliate to create approval workflow');
  }

  const workflowId = `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const approval = new ApprovalWorkflow({
    workflowId,
    changeType,
    entityId,
    entityType,
    affiliateId: userContext.affiliateId,
    organizationId: userContext.organizationId,
    requestedBy: userContext.userId,
    status: ApprovalStatus.PENDING,
    changeDetails,
    comments,
  });

  await approval.save();
  return approval;
}

/**
 * Check if an entity has pending approvals
 */
export async function hasPendingApproval(
  entityId: string,
  entityType: string,
  affiliateId: string
): Promise<boolean> {
  const pending = await ApprovalWorkflow.findOne({
    entityId,
    entityType,
    affiliateId,
    status: ApprovalStatus.PENDING,
  });

  return !!pending;
}

/**
 * Get pending approvals for an entity
 */
export async function getPendingApprovals(
  entityId: string,
  entityType: string,
  affiliateId: string
): Promise<ApprovalWorkflow[]> {
  return await ApprovalWorkflow.find({
    entityId,
    entityType,
    affiliateId,
    status: ApprovalStatus.PENDING,
  });
}

