import { GET } from '@/app/api/regulations/modules/route';

describe('GET /api/regulations/modules', () => {
  it('returns 200 and modules array', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('modules');
    expect(Array.isArray(data.modules)).toBe(true);
  });

  it('modules include DORA and Chilean Privacy', async () => {
    const res = await GET();
    const data = await res.json();
    const ids = data.modules.map((m: { id: string }) => m.id);
    expect(ids).toContain('DORA');
    expect(ids).toContain('CHILEAN_PRIVACY');
  });
});
