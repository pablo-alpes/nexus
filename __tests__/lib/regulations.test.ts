import {
  getRegulationConfig,
  getRegulationModules,
  getAllRegulations,
  RegulationType,
  DORA_CONFIG,
  CHILEAN_PRIVACY_CONFIG,
} from '@/lib/regulations';

describe('regulations', () => {
  describe('getRegulationConfig', () => {
    it('returns DORA config for DORA type', () => {
      const config = getRegulationConfig(RegulationType.DORA);
      expect(config.type).toBe(RegulationType.DORA);
      expect(config.name).toBe(DORA_CONFIG.name);
      expect(config.pillars.length).toBeGreaterThan(0);
      expect(config.requirementPrefix).toBe('DORA-REQ');
    });

    it('returns Chilean Privacy config for CHILEAN_PRIVACY type', () => {
      const config = getRegulationConfig(RegulationType.CHILEAN_PRIVACY);
      expect(config.type).toBe(RegulationType.CHILEAN_PRIVACY);
      expect(config.name).toBe(CHILEAN_PRIVACY_CONFIG.name);
      expect(config.pillars.length).toBe(8);
      expect(config.requirementPrefix).toBe('CHILE-REQ');
    });
  });

  describe('getRegulationModules', () => {
    it('returns at least DORA and Chilean Privacy modules', () => {
      const modules = getRegulationModules();
      expect(modules.length).toBeGreaterThanOrEqual(2);
      const ids = modules.map((m) => m.id);
      expect(ids).toContain(RegulationType.DORA);
      expect(ids).toContain(RegulationType.CHILEAN_PRIVACY);
    });

    it('each module has id, name, description, routePrefix', () => {
      const modules = getRegulationModules();
      for (const mod of modules) {
        expect(mod).toHaveProperty('id');
        expect(mod).toHaveProperty('name');
        expect(mod).toHaveProperty('description');
        expect(mod).toHaveProperty('routePrefix');
        expect(typeof mod.id).toBe('string');
        expect(typeof mod.name).toBe('string');
      }
    });

    it('DORA has empty routePrefix, Chilean Privacy has /chile-privacy', () => {
      const modules = getRegulationModules();
      const dora = modules.find((m) => m.id === RegulationType.DORA);
      const chile = modules.find((m) => m.id === RegulationType.CHILEAN_PRIVACY);
      expect(dora?.routePrefix).toBe('');
      expect(chile?.routePrefix).toBe('/chile-privacy');
    });
  });

  describe('getAllRegulations', () => {
    it('returns all configs', () => {
      const all = getAllRegulations();
      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(all.map((c) => c.type)).toContain(RegulationType.DORA);
      expect(all.map((c) => c.type)).toContain(RegulationType.CHILEAN_PRIVACY);
    });
  });
});
