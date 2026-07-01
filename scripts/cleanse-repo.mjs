#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const apply = process.argv.includes('--apply');

const docsArchive = path.join(root, 'docs', 'archive', 'root-markdown');
const scriptsArchive = path.join(root, 'scripts', 'archive');

const keepRootDocs = new Set([
  'README.md',
  'SETUP.md',
  'DEPLOYMENT.md',
  'RULE_ENGINE.md',
]);

const rootDocPattern =
  /(SUMMARY|ANALYSIS|GUIDE|IMPLEMENTATION|ISSUES|RESULTS|COMPARISON|UPDATES|TAILSCALE|MODEL_MIGRATION|PREPOPULATION|DIRECT_DEPLOYMENT|SEPARATE_WEBSITES|APPS_STRUCTURE|LEGAL_PROTECTION|CHILEAN_PRIVACY_TESTING|DATA_LOADING|TEST_SUITE)/i;

const scriptArchivePattern = /^(test-|analyze-|compare-|check-|recompute-).*\.(js|ts)$/i;
const keepScripts = new Set([
  'precompute-mappings.ts',
  'precompute-chilean-privacy-mappings.ts',
  'seed-demo-data.ts',
  'verify-dora-engine.ts',
  'demo-prod-all-in-one.sh',
  'prod-https-server.mjs',
  'cleanse-repo.mjs',
]);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveFile(from, to) {
  ensureDir(path.dirname(to));
  fs.renameSync(from, to);
}

function run() {
  const rootCandidates = fs
    .readdirSync(root)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => !keepRootDocs.has(name))
    .filter((name) => rootDocPattern.test(name));

  const scriptsDir = path.join(root, 'scripts');
  const scriptCandidates = fs
    .readdirSync(scriptsDir)
    .filter((name) => scriptArchivePattern.test(name))
    .filter((name) => !keepScripts.has(name));

  if (!apply) {
    console.log('Dry run. Use --apply to move files.');
    console.log(`Root docs to archive: ${rootCandidates.length}`);
    rootCandidates.forEach((name) => console.log(`  - ${name}`));
    console.log(`Scripts to archive: ${scriptCandidates.length}`);
    scriptCandidates.forEach((name) => console.log(`  - scripts/${name}`));
    process.exit(0);
  }

  ensureDir(docsArchive);
  ensureDir(scriptsArchive);

  for (const name of rootCandidates) {
    moveFile(path.join(root, name), path.join(docsArchive, name));
  }

  for (const name of scriptCandidates) {
    moveFile(path.join(scriptsDir, name), path.join(scriptsArchive, name));
  }

  console.log(`✅ Archived ${rootCandidates.length} root markdown files`);
  console.log(`✅ Archived ${scriptCandidates.length} legacy scripts`);
}

run();
