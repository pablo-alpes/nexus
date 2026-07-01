/**
 * Fix DORA requirement pillar assignment using ISO controls as source of truth.
 *
 * It updates:
 * - data/dora-requirements-final.json
 * - data/local-db/DORARequirement_DORA.json (if present)
 * - data/local-db/DORARequirement.json (if present)
 *
 * Usage:
 *   npx tsx scripts/fix-dora-pillar-mappings.ts
 */

import fs from 'fs';
import path from 'path';

type Requirement = {
  requirementId: string;
  pillar?: string;
  [k: string]: any;
};

type IsoControl = {
  pillar: string;
  doraRequirements?: string[];
};

const ROOT = process.cwd();
const SOURCE_REQ_PATH = path.join(ROOT, 'data', 'dora-requirements-final.json');
const ISO_CONTROLS_PATH = path.join(ROOT, 'data', 'iso27002-controls.json');
const LOCAL_DB_DIR = path.join(ROOT, 'data', 'local-db');
const LOCAL_REQ_FILES = ['DORARequirement_DORA.json', 'DORARequirement.json'];

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function buildPillarVotes(controls: IsoControl[]) {
  const votes = new Map<string, Map<string, number>>();
  for (const control of controls) {
    const reqs = control.doraRequirements || [];
    for (const reqId of reqs) {
      if (!votes.has(reqId)) votes.set(reqId, new Map<string, number>());
      const reqVotes = votes.get(reqId)!;
      reqVotes.set(control.pillar, (reqVotes.get(control.pillar) || 0) + 1);
    }
  }
  return votes;
}

function inferPillar(reqId: string, currentPillar: string | undefined, votes: Map<string, Map<string, number>>) {
  const reqVotes = votes.get(reqId);
  if (!reqVotes || reqVotes.size === 0) return currentPillar || 'ICT_RISK_MANAGEMENT';
  const sorted = Array.from(reqVotes.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

function updateRequirements(reqs: Requirement[], votes: Map<string, Map<string, number>>) {
  let changed = 0;
  for (const req of reqs) {
    const inferred = inferPillar(req.requirementId, req.pillar, votes);
    if (inferred && req.pillar !== inferred) {
      req.pillar = inferred;
      changed++;
    }
  }
  return changed;
}

function countByPillar(reqs: Requirement[]) {
  return reqs.reduce<Record<string, number>>((acc, req) => {
    const pillar = req.pillar || 'UNKNOWN';
    acc[pillar] = (acc[pillar] || 0) + 1;
    return acc;
  }, {});
}

function main() {
  if (!fs.existsSync(SOURCE_REQ_PATH) || !fs.existsSync(ISO_CONTROLS_PATH)) {
    throw new Error('Required source files are missing (requirements or ISO controls).');
  }

  const sourceData = readJson<{ metadata?: any; requirements: Requirement[] }>(SOURCE_REQ_PATH);
  const isoData = readJson<{ controls: IsoControl[] }>(ISO_CONTROLS_PATH);

  const votes = buildPillarVotes(isoData.controls || []);

  const sourceChanged = updateRequirements(sourceData.requirements, votes);
  writeJson(SOURCE_REQ_PATH, sourceData);

  console.log('✅ Updated source requirements:', SOURCE_REQ_PATH);
  console.log('   Changed rows:', sourceChanged);
  console.log('   New distribution:', countByPillar(sourceData.requirements));

  if (fs.existsSync(LOCAL_DB_DIR)) {
    for (const fileName of LOCAL_REQ_FILES) {
      const filePath = path.join(LOCAL_DB_DIR, fileName);
      if (!fs.existsSync(filePath)) continue;
      const rows = readJson<Requirement[]>(filePath);
      const changed = updateRequirements(rows, votes);
      writeJson(filePath, rows);
      console.log(`✅ Updated local DB requirements: ${fileName} (changed: ${changed})`);
      console.log('   Distribution:', countByPillar(rows));
    }
  }

  console.log('🎯 Pillar fix completed.');
}

main();
