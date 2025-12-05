/**
 * Setup script to parse Excel and create JSON structure
 * Run this once before starting the application
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up DORA requirements data...\n');

// Step 1: Parse Excel file
console.log('Step 1: Parsing Excel file...');
const workbook = XLSX.readFile(path.join(__dirname, '../DORA_Gap_Assessment_Template_v1.1.xlsx'));
const worksheet = workbook.Sheets['DORA Requirements'];
const range = XLSX.utils.decode_range(worksheet['!ref']);

const allRows = [];
for (let R = 0; R <= range.e.r; R++) {
  const row = [];
  for (let C = 0; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = worksheet[cellAddress];
    row.push(cell ? cell.v : null);
  }
  allRows.push(row);
}

// Find header row
let headerRowIndex = -1;
const possibleHeaders = ['Chapter', 'Article', 'Paragraph', 'Requirement', 'Control', 'Compliance'];

for (let R = 0; R < Math.min(20, allRows.length); R++) {
  const row = allRows[R];
  const rowText = row.map(c => String(c || '')).join(' ').toLowerCase();
  
  if (possibleHeaders.some(h => rowText.includes(h.toLowerCase()))) {
    headerRowIndex = R;
    break;
  }
}

if (headerRowIndex < 0) {
  console.error('❌ Could not find header row');
  process.exit(1);
}

// Parse requirements
const headers = allRows[headerRowIndex].map((h, idx) => {
  if (h && String(h).trim()) return String(h).trim();
  return `Column_${idx}`;
});

const requirements = [];
for (let R = headerRowIndex + 1; R < allRows.length; R++) {
  const row = allRows[R];
  const requirement = {};
  let hasData = false;
  
  headers.forEach((header, idx) => {
    const value = row[idx];
    if (value !== null && value !== undefined && value !== '') {
      hasData = true;
      requirement[header] = value;
    }
  });
  
  if (hasData) {
    requirements.push(requirement);
  }
}

console.log(`✅ Parsed ${requirements.length} requirements\n`);

// Step 2: Load ISO 27001 mappings
console.log('Step 2: Loading ISO 27001 mappings...');
const isoMappingsPath = path.join(__dirname, '../data/iso27001-mappings.json');
let isoMappings = { mappings: {} };

if (fs.existsSync(isoMappingsPath)) {
  isoMappings = JSON.parse(fs.readFileSync(isoMappingsPath, 'utf8'));
  console.log('✅ ISO 27001 mappings loaded\n');
} else {
  console.log('⚠️  ISO 27001 mappings file not found, creating default...\n');
}

// Step 3: Map chapters to pillars and structure requirements
console.log('Step 3: Structuring requirements...');

const chapterToPillar = {
  'CHAPTER I': 'ICT_RISK_MANAGEMENT',
  'CHAPTER II': 'ICT_RISK_MANAGEMENT',
  'CHAPTER III': 'INCIDENT_MANAGEMENT',
  'CHAPTER IV': 'RESILIENCE_TESTING',
  'CHAPTER V': 'THIRD_PARTY_RISK',
  'CHAPTER VI': 'INFORMATION_SHARING',
};

function getPillarFromChapter(chapter) {
  if (!chapter) return 'ICT_RISK_MANAGEMENT';
  
  for (const [key, pillar] of Object.entries(chapterToPillar)) {
    if (chapter.includes(key)) {
      return pillar;
    }
  }
  return 'ICT_RISK_MANAGEMENT';
}

function mapComplianceStatus(status) {
  const mapping = {
    'Not Applicable': 'NOT_APPLICABLE',
    'Fully Compliant': 'FULLY_COMPLIANT',
    'Partially Compliant': 'PARTIALLY_COMPLIANT',
    'Not Compliant': 'NOT_COMPLIANT',
  };
  return mapping[status] || 'NOT_APPLICABLE';
}

const structuredRequirements = requirements.map((req, idx) => {
  const pillar = getPillarFromChapter(req.Chapter);
  const isoMappingsForPillar = isoMappings.mappings[pillar]?.controls || [];
  
  return {
    requirementId: `DORA-REQ-${String(req['Requirement ID'] || idx + 1).padStart(3, '0')}`,
    chapter: req.Chapter || null,
    article: req.Article || null,
    paragraph: req['Requirement ID'] || null,
    title: req.Article || `Requirement ${req['Requirement ID'] || idx + 1}`,
    description: req.Requirement || '',
    legalText: req.Requirement || '',
    pillar: pillar,
    complianceStatus: mapComplianceStatus(req.Compliance || 'Not Applicable'),
    notes: req.Notes || null,
    iso27001Mappings: isoMappingsForPillar.map(m => ({
      control: m.iso27001Control,
      title: m.title,
      description: m.description,
      relevance: m.relevance,
    })),
  };
});

// Step 4: Save structured JSON
console.log('Step 4: Saving structured JSON...');
const output = {
  metadata: {
    version: '1.0',
    sourceFile: 'DORA_Gap_Assessment_Template_v1.1.xlsx',
    generatedAt: new Date().toISOString(),
    totalRequirements: structuredRequirements.length,
    pillars: {
      ICT_RISK_MANAGEMENT: structuredRequirements.filter(r => r.pillar === 'ICT_RISK_MANAGEMENT').length,
      INCIDENT_MANAGEMENT: structuredRequirements.filter(r => r.pillar === 'INCIDENT_MANAGEMENT').length,
      RESILIENCE_TESTING: structuredRequirements.filter(r => r.pillar === 'RESILIENCE_TESTING').length,
      THIRD_PARTY_RISK: structuredRequirements.filter(r => r.pillar === 'THIRD_PARTY_RISK').length,
      INFORMATION_SHARING: structuredRequirements.filter(r => r.pillar === 'INFORMATION_SHARING').length,
    },
  },
  requirements: structuredRequirements,
};

const outputPath = path.join(__dirname, '../data/dora-requirements-final.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✅ Saved to: ${outputPath}`);
console.log('\n📊 Statistics by Pillar:');
Object.entries(output.metadata.pillars).forEach(([pillar, count]) => {
  console.log(`  ${pillar}: ${count} requirements`);
});

console.log('\n✨ Setup complete! Requirements will be auto-imported on first API call.\n');

