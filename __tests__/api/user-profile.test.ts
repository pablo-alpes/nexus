import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/user/profile/route';
import { connectDBLocal } from '@/lib/mongodb-local';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { RegulationType } from '@/lib/regulations';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function authRequest(url: string, userId: string, options: { method?: string; body?: object } = {}) {
  const token = jwt.sign({ userId, email: 'profile-test@example.com' }, JWT_SECRET, { expiresIn: '1h' });
  return new NextRequest(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body && { 'Content-Type': 'application/json' }),
    },
    ...(options.body && { body: JSON.stringify(options.body) }),
  });
}

describe('User Profile API', () => {
  let testUserId: string;

  beforeAll(async () => {
    await connectDBLocal();
    process.env.USE_LOCAL_STORAGE = 'true';
    const hashed = await hashPassword('pass123');
    const user = await User.create({
      email: 'profile-test@example.com',
      password: hashed,
      name: 'Profile Test',
      preferredRegulation: RegulationType.DORA,
      enabledRegulations: [RegulationType.DORA, RegulationType.CHILEAN_PRIVACY],
    });
    testUserId = (user as any)._id;
  });

  describe('GET /api/user/profile', () => {
    it('returns 401 without Authorization', async () => {
      const req = new NextRequest('http://localhost/api/user/profile');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 and user profile with valid token', async () => {
      const req = authRequest('http://localhost/api/user/profile', testUserId);
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.email).toBe('profile-test@example.com');
      expect(data.name).toBe('Profile Test');
      expect(data.preferredRegulation).toBe(RegulationType.DORA);
      expect(data.enabledRegulations).toEqual(
        expect.arrayContaining([RegulationType.DORA, RegulationType.CHILEAN_PRIVACY])
      );
    });
  });

  describe('PATCH /api/user/profile', () => {
    it('returns 401 without Authorization', async () => {
      const req = new NextRequest('http://localhost/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ preferredRegulation: RegulationType.CHILEAN_PRIVACY }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 and updates preferredRegulation', async () => {
      const req = authRequest('http://localhost/api/user/profile', testUserId, {
        method: 'PATCH',
        body: { preferredRegulation: RegulationType.CHILEAN_PRIVACY },
      });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.preferredRegulation).toBe(RegulationType.CHILEAN_PRIVACY);

      // Restore for other tests
      await User.findOneAndUpdate(
        { _id: testUserId },
        { preferredRegulation: RegulationType.DORA },
        { new: true }
      );
    });

    it('returns 400 when no valid fields to update', async () => {
      const req = authRequest('http://localhost/api/user/profile', testUserId, {
        method: 'PATCH',
        body: {},
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });
  });
});
