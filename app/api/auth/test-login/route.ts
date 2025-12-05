import { NextRequest, NextResponse } from 'next/server';
import { isTestMode, getTestUser, getTestToken } from '@/lib/test-mode';

/**
 * Test login endpoint - returns a test token without requiring credentials
 * Only works when TEST_MODE=true
 */
export async function POST(request: NextRequest) {
  if (!isTestMode()) {
    return NextResponse.json(
      { error: 'Test mode is not enabled' },
      { status: 403 }
    );
  }

  const testUser = getTestUser();
  const token = getTestToken();

  return NextResponse.json({
    token,
    user: {
      id: testUser.userId,
      email: testUser.email,
      name: testUser.name,
      company: testUser.company,
    },
    message: 'Test mode: Login successful (no credentials required)',
  });
}

/**
 * GET endpoint to check if test mode is enabled
 */
export async function GET() {
  return NextResponse.json({
    testMode: isTestMode(),
    testUser: isTestMode() ? getTestUser() : null,
    message: isTestMode() 
      ? 'Test mode is enabled. Use POST /api/auth/test-login to get a test token.'
      : 'Test mode is disabled. Set TEST_MODE=true to enable.',
  });
}

