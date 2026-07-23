/**
 * Permission system for Chile Privacy SaaS (cabinet → client multitenancy)
 */

import { UserRole } from '@/models/Cabinet';
import User from '@/models/User';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  cabinetId?: string;
  clientId?: string;
  name?: string;
  permissions?: {
    canAccessRuleEngine?: boolean;
    canValidateEvidence?: boolean;
    canEditRuleEngine?: boolean;
    canUploadEvidence?: boolean;
    canManageRoadmap?: boolean;
    isCabinetAdmin?: boolean;
  };
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

export function canAccessClient(user: UserContext, clientId: string): PermissionCheck {
  if (user.role === UserRole.PLATFORM_ADMIN) {
    return { allowed: true };
  }

  if (user.role === UserRole.CABINET_ADMIN || user.role === UserRole.CABINET_LAWYER) {
    // Cabinet staff: client must belong to their cabinet (enforced at query layer)
    return { allowed: true };
  }

  if (user.role === UserRole.CLIENT_USER) {
    if (user.clientId === clientId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Client users can only access their own company' };
  }

  return { allowed: false, reason: 'Invalid role' };
}

export function canAccessCabinet(user: UserContext, cabinetId: string): PermissionCheck {
  if (user.role === UserRole.PLATFORM_ADMIN) {
    return { allowed: true };
  }

  if (user.cabinetId === cabinetId) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'User cannot access this cabinet' };
}

export function canManageClients(user: UserContext): PermissionCheck {
  if (user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.CABINET_ADMIN) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'Only platform or cabinet admins can manage clients' };
}

export function canAccessRuleEngine(user: UserContext): PermissionCheck {
  if (user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.CABINET_ADMIN) {
    return { allowed: true };
  }
  if (user.permissions?.canAccessRuleEngine) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'No permission to access rule engine' };
}

export function canValidateEvidence(user: UserContext): PermissionCheck {
  if (
    user.role === UserRole.PLATFORM_ADMIN ||
    user.role === UserRole.CABINET_ADMIN ||
    user.role === UserRole.CABINET_LAWYER
  ) {
    return { allowed: true };
  }
  if (user.permissions?.canValidateEvidence) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'No permission to validate evidence' };
}

export function canUploadEvidence(user: UserContext): PermissionCheck {
  if (user.permissions?.canUploadEvidence === false) {
    return { allowed: false, reason: 'Upload evidence disabled' };
  }
  return { allowed: true };
}

export function canManageRoadmap(user: UserContext): PermissionCheck {
  if (
    user.role === UserRole.PLATFORM_ADMIN ||
    user.role === UserRole.CABINET_ADMIN ||
    user.role === UserRole.CABINET_LAWYER
  ) {
    return { allowed: true };
  }
  if (user.permissions?.canManageRoadmap) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'No permission to manage roadmap' };
}

export function canModifyClientData(user: UserContext, clientId: string): PermissionCheck {
  const access = canAccessClient(user, clientId);
  if (!access.allowed) return access;

  if (user.role === UserRole.CLIENT_USER) {
    // Client users may create/update DSARs and upload evidence for their company
    return { allowed: true };
  }

  return { allowed: true };
}

export async function getUserContext(userId: string): Promise<UserContext | null> {
  try {
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
      name: user.name,
      role: (user.role as UserRole) || UserRole.CLIENT_USER,
      cabinetId: user.cabinetId ? String(user.cabinetId) : undefined,
      clientId: user.clientId ? String(user.clientId) : undefined,
      permissions: user.permissions,
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}
