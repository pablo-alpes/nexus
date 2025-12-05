/**
 * Authentication helper that bypasses auth in test mode
 */

import { verifyToken } from './auth';
import { isTestMode, getTestUser } from './test-mode';
import { NextRequest } from 'next/server';

export function getAuthUser(request: NextRequest): { userId: string; email: string } | null {
  // Test mode: return test user without checking token
  if (isTestMode()) {
    const testUser = getTestUser();
    return {
      userId: testUser.userId,
      email: testUser.email,
    };
  }

  // Normal mode: verify token
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

export function requireAuth(request: NextRequest): { userId: string; email: string } {
  const user = getAuthUser(request);
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

