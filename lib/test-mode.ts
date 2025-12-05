/**
 * Test mode utilities - bypasses authentication for testing
 */

export function isTestMode(): boolean {
  return process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'development';
}

export function getTestUser() {
  return {
    userId: 'test-user-123',
    email: 'test@nexuscloud.local',
    name: 'Test User',
    company: 'Test Company',
  };
}

export function getTestToken(): string {
  // Generate a simple test token
  return 'test-token-' + Buffer.from(JSON.stringify(getTestUser())).toString('base64');
}

