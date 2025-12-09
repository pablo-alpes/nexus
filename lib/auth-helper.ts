/**
 * Authentication helper that bypasses auth in test mode
 */

import { verifyToken } from './auth';
import { isTestMode, getTestUser } from './test-mode';
import { NextRequest } from 'next/server';
import { getUserContext, UserContext } from './permissions';

export interface AuthUser {
  userId: string;
  email: string;
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  // Always try to get token first, even in test mode
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  // If we have a token, try to verify it (works in both test and normal mode)
  if (token) {
    try {
      return verifyToken(token);
    } catch (error) {
      // If token verification fails, continue to test mode fallback if enabled
    }
  }

  // Test mode: return test user only if no valid token was provided
  if (isTestMode()) {
    const testUser = getTestUser();
    return {
      userId: testUser.userId,
      email: testUser.email,
    };
  }

  // No token and not in test mode
  return null;
}

/**
 * Get full user context with role and permissions
 */
export async function getAuthUserContext(request: NextRequest): Promise<UserContext | null> {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return null;
  }

  // Try to get user context from database using userId from token
  const userContext = await getUserContext(authUser.userId);
  
  // If user found, return it
  if (userContext) {
    return userContext;
  }

  // If user not found and we're in test mode, try to find by email
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
          role: user.role,
          organizationId: user.organizationId?.toString(),
          affiliateId: user.affiliateId?.toString(),
          permissions: user.permissions,
        };
      }
    } catch (error) {
      console.error('Error loading user from DB in test mode:', error);
    }
  }

  // User not found
  return null;
}

export function requireAuth(request: NextRequest): { userId: string; email: string } {
  const user = getAuthUser(request);
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

