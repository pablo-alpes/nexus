/**
 * Authentication helper that bypasses auth in test mode
 */

import { verifyToken } from './auth';
import { isTestMode, getTestUser } from './test-mode';
import { NextRequest } from 'next/server';
import { getUserContext, UserContext } from './permissions';
import { UserRole } from '@/models/Cabinet';

export interface AuthUser {
  userId: string;
  email: string;
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      return verifyToken(token);
    } catch {
      // fall through to test mode
    }
  }

  if (isTestMode()) {
    const testUser = getTestUser();
    return {
      userId: testUser.userId,
      email: testUser.email,
    };
  }

  return null;
}

/**
 * Full user context with role and cabinet/client scope
 */
export async function getAuthUserContext(request: NextRequest): Promise<UserContext | null> {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return null;
  }

  const userContext = await getUserContext(authUser.userId);
  if (userContext) {
    return userContext;
  }

  // Test / demo fallback when user row not yet seeded
  if (isTestMode()) {
    try {
      const { connectDBLocal } = await import('@/lib/mongodb-local');
      await connectDBLocal();
      const User = (await import('@/models/User')).default;
      const user = await User.findOne({ email: authUser.email });
      if (user) {
        return {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          role: (user.role as UserRole) || UserRole.CABINET_ADMIN,
          cabinetId: user.cabinetId ? String(user.cabinetId) : undefined,
          clientId: user.clientId ? String(user.clientId) : undefined,
          permissions: user.permissions,
        };
      }
    } catch (error) {
      console.error('Error loading user from DB in test mode:', error);
    }

    // Last resort: ephemeral demo context
    return {
      userId: authUser.userId,
      email: authUser.email,
      role: UserRole.CABINET_ADMIN,
      name: 'Demo User',
    };
  }

  return null;
}

export function requireAuth(request: NextRequest): AuthUser {
  const user = getAuthUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAuthContext(request: NextRequest): Promise<UserContext> {
  const ctx = await getAuthUserContext(request);
  if (!ctx) {
    throw new Error('Unauthorized');
  }
  return ctx;
}
