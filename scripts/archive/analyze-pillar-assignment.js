const fs = require('fs');
const path = require('path');

// Read the final JSON
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/dora-requirements-final.json'), 'utf8')
);

// Chapter to pillar mapping (from create-structured-json.js)
const chapterToPillar = {
  'CHAPTER I': 'ICT_RISK_MANAGEMENT',
  'CHAPTER II': 'ICT_RISK_MANAGEMENT',
  'CHAPTER III': 'INCIDENT_MANAGEMENT',
  'CHAPTER IV': 'RESILIENCE_TESTING',
  'CHAPTER V': 'THIRD_PARTY_RISK',
  'CHAPTER VI': 'INFORMATION_SHARING',
};

// Analyze pillar assignments
const issues = [];
const pillarStats = {
  ICT_RISK_MANAGEMENT: { correct: 0, incorrect: 0, chapters: new Set() },
  INCIDENT_MANAGEMENT: { correct: 0, incorrect: 0, chapters: new Set() },
  RESILIENCE_TESTING: { correct: 0, incorrect: 0, chapters: new Set() },
  THIRD_PARTY_RISK: { correct: 0, incorrect: 0, chapters: new Set() },
  INFORMATION_SHARING: { correct: 0, incorrect: 0, chapters: new Set() },
};

function getExpectedPillar(chapter) {
  if (!chapter) return 'ICT_RISK_MANAGEMENT';
  
  for (const [key, pillar] of Object.entries(chapterToPillar)) {
    if (chapter.includes(key)) {
      return pillar;
    }
  }
  return 'ICT_RISK_MANAGEMENT';
}

data.requirements.forEach(req => {
  const expectedPillar = getExpectedPillar(req.chapter);
  const actualPillar = req.pillar;
  
  if (expectedPillar !== actualPillar) {
    issues.push({
      requirementId: req.requirementId,
      chapter: req.chapter,
      article: req.article,
      expectedPillar: expectedPillar,
      actualPillar: actualPillar,
    });
    
    if (pillarStats[actualPillar]) {
      pillarStats[actualPillar].incorrect++;
      pillarStats[actualPillar].chapters.add(req.chapter);
    }
  } else {
    if (pillarStats[actualPillar]) {
      pillarStats[actualPillar].correct++;
      pillarStats[actualPillar].chapters.add(req.chapter);
    }
  }
});

console.log('='.repeat(80));
console.log('PILLAR ASSIGNMENT ANALYSIS');
console.log('='.repeat(80));
console.log(`\nTotal requirements: ${data.requirements.length}`);
console.log(`Issues found: ${issues.length}`);

console.log('\n📊 Pillar Statistics:');
Object.entries(pillarStats).forEach(([pillar, stats]) => {
  const total = stats.correct + stats.incorrect;
  console.log(`\n${pillar}:`);
  console.log(`  Correct: ${stats.correct}`);
  console.log(`  Incorrect: ${stats.incorrect}`);
  console.log(`  Total: ${total}`);
  console.log(`  Chapters: ${Array.from(stats.chapters).join(', ')}`);
});

console.log('\n❌ Incorrect Pillar Assignments (first 20):');
issues.slice(0, 20).forEach(issue => {
  console.log(`\n  ${issue.requirementId}:`);
  console.log(`    Chapter: ${issue.chapter}`);
  console.log(`    Article: ${issue.article}`);
  console.log(`    Expected: ${issue.expectedPillar}`);
  console.log(`    Actual: ${issue.actualPillar}`);
});

// Group issues by chapter
const issuesByChapter = {};
issues.forEach(issue => {
  const chapter = issue.chapter || 'Unknown';
  if (!issuesByChapter[chapter]) {
    issuesByChapter[chapter] = [];
  }
  issuesByChapter[chapter].push(issue);
});

console.log('\n📋 Issues by Chapter:');
Object.entries(issuesByChapter).forEach(([chapter, chapterIssues]) => {
  console.log(`\n${chapter}: ${chapterIssues.length} issues`);
  const expectedPillar = getExpectedPillar(chapter);
  console.log(`  Expected pillar: ${expectedPillar}`);
  const actualPillars = [...new Set(chapterIssues.map(i => i.actualPillar))];
  console.log(`  Actual pillars: ${actualPillars.join(', ')}`);
});

// Save report
const report = {
  totalRequirements: data.requirements.length,
  totalIssues: issues.length,
  issuesByChapter: Object.fromEntries(
    Object.entries(issuesByChapter).map(([chapter, chapterIssues]) => [
      chapter,
      {
        expectedPillar: getExpectedPillar(chapter),
        issueCount: chapterIssues.length,
        issues: chapterIssues.slice(0, 10) // First 10 per chapter
      }
    ])
  ),
  allIssues: issues,
};

fs.writeFileSync(
  path.join(__dirname, '../data/pillar-assignment-issues.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n✅ Detailed report saved to: data/pillar-assignment-issues.json');

