import { NextRequest } from 'next/server';
import { POST as Register } from '@/app/api/auth/register/route';
import { POST as Login } from '@/app/api/auth/login/route';

function jsonRequest(url: string, body: object): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Auth API', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  describe('POST /api/auth/register', () => {
    it('returns 400 when email or password missing', async () => {
      const req = jsonRequest('http://localhost/api/auth/register', {
        email: testEmail,
        name: testName,
      });
      const res = await Register(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/required/i);
    });

    it('returns 200 and token + user when registration succeeds', async () => {
      const req = jsonRequest('http://localhost/api/auth/register', {
        email: testEmail,
        password: testPassword,
        name: testName,
        company: 'Test Co',
      });
      const res = await Register(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(testEmail);
      expect(data.user.name).toBe(testName);
      expect(data.user.preferredRegulation).toBeDefined();
      expect(Array.isArray(data.user.enabledRegulations)).toBe(true);
    });

    it('returns 400 when user already exists', async () => {
      const req = jsonRequest('http://localhost/api/auth/register', {
        email: testEmail,
        password: 'OtherPass1!',
        name: 'Other',
      });
      const res = await Register(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email or password missing', async () => {
      const req = jsonRequest('http://localhost/api/auth/login', { email: testEmail });
      const res = await Login(req);
      expect(res.status).toBe(400);
    });

    it('returns 401 for wrong password', async () => {
      const req = jsonRequest('http://localhost/api/auth/login', {
        email: testEmail,
        password: 'WrongPassword1!',
      });
      const res = await Login(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 and token when credentials are correct', async () => {
      const req = jsonRequest('http://localhost/api/auth/login', {
        email: testEmail,
        password: testPassword,
      });
      const res = await Login(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('token');
      expect(data.user.email).toBe(testEmail);
    });
  });
});
