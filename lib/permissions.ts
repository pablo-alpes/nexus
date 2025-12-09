/**
 * Permission system for multi-tenant DORA compliance platform
 */

import { UserRole } from '@/models/Organization';
import User from '@/models/User';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  affiliateId?: string;
  permissions?: {
    canAccessRuleEngine?: boolean;
    canValidateEvidence?: boolean;
    canEditRuleEngine?: boolean;
    canUploadEvidence?: boolean;
    canManageRoadmap?: boolean;
    isOrganizationAdmin?: boolean;
  };
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if user can access a specific affiliate's data
 */
export function canAccessAffiliate(user: UserContext, affiliateId: string): PermissionCheck {
  // SuperAdmin can access all affiliates in their organization
  if (user.role === UserRole.SUPER_ADMIN) {
    return { allowed: true };
  }

  // Admin and User can only access their own affiliate
  if (user.role === UserRole.ADMIN || user.role === UserRole.USER) {
    if (user.affiliateId === affiliateId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'User can only access their own affiliate' };
  }

  return { allowed: false, reason: 'Invalid role' };
}

/**
 * Check if user can access rule engine
 */
export function canAccessRuleEngine(user: UserContext): PermissionCheck {
  // SuperAdmin always has access
  if (user.role === UserRole.SUPER_ADMIN) {
    return { allowed: true };
  }

  // Check explicit permission
  if (user.permissions?.canAccessRuleEngine) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'User does not have permission to access rule engine' };
}

/**
 * Check if user can validate evidence
 */
export function canValidateEvidence(user: UserContext): PermissionCheck {
  // SuperAdmin and Admin can validate
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    return { allowed: true };
  }

  // Check explicit permission
  if (user.permissions?.canValidateEvidence) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'User does not have permission to validate evidence' };
}

/**
 * Check if user can edit rule engine
 */
export function canEditRuleEngine(user: UserContext): PermissionCheck {
  // SuperAdmin always can edit
  if (user.role === UserRole.SUPER_ADMIN) {
    return { allowed: true };
  }

  // Check explicit permission
  if (user.permissions?.canEditRuleEngine) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'User does not have permission to edit rule engine' };
}

/**
 * Check if user can upload evidence
 */
export function canUploadEvidence(user: UserContext): PermissionCheck {
  // All authenticated users can upload by default, unless explicitly restricted
  // But if permission is explicitly set, respect it
  if (user.permissions?.canUploadEvidence === false) {
    return { allowed: false, reason: 'User does not have permission to upload evidence' };
  }

  // Default: allow upload
  return { allowed: true };
}

/**
 * Check if user can manage roadmap
 */
export function canManageRoadmap(user: UserContext): PermissionCheck {
  // SuperAdmin and Admin can manage
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    return { allowed: true };
  }

  // Check explicit permission
  if (user.permissions?.canManageRoadmap) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'User does not have permission to manage roadmap' };
}

/**
 * Check if user is organization admin
 */
export function isOrganizationAdmin(user: UserContext): PermissionCheck {
  // SuperAdmin is always org admin
  if (user.role === UserRole.SUPER_ADMIN) {
    return { allowed: true };
  }

  // Check explicit permission
  if (user.permissions?.isOrganizationAdmin) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'User is not an organization admin' };
}

/**
 * Check if user can approve changes
 */
export function canApproveChanges(user: UserContext, affiliateId: string): PermissionCheck {
  // SuperAdmin can approve any affiliate in their organization
  if (user.role === UserRole.SUPER_ADMIN) {
    return { allowed: true };
  }

  // Admin can approve changes in their affiliate
  if (user.role === UserRole.ADMIN) {
    if (user.affiliateId === affiliateId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Admin can only approve changes in their own affiliate' };
  }

  return { allowed: false, reason: 'Only SuperAdmin and Admin can approve changes' };
}

/**
 * Check if user can create/edit/delete entities
 */
export function canModifyEntity(user: UserContext, affiliateId: string): PermissionCheck {
  // All authenticated users can modify entities in their affiliate
  if (user.role === UserRole.SUPER_ADMIN) {
    return { allowed: true };
  }

  if (user.role === UserRole.ADMIN || user.role === UserRole.USER) {
    if (user.affiliateId === affiliateId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'User can only modify entities in their own affiliate' };
  }

  return { allowed: false, reason: 'Invalid role' };
}

/**
 * Get user context from database
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  try {
    // Ensure database connection
    const { connectDBLocal } = await import('@/lib/mongodb-local');
    await connectDBLocal();
    
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`User not found with userId: ${userId}`);
      return null;
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId?.toString(),
      affiliateId: user.affiliateId?.toString(),
      permissions: user.permissions,
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

/**
 * Check if user needs approval for a material change
 */
export function requiresApproval(changeType: string, user: UserContext): boolean {
  // SuperAdmin changes don't need approval
  if (user.role === UserRole.SUPER_ADMIN) {
    return false;
  }

  // Admin changes might need approval depending on organization policy
  // For now, only USER changes require approval
  if (user.role === UserRole.USER) {
    return true;
  }

  return false;
}

