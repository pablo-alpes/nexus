const fs = require('fs');
const path = require('path');

// Read parsed data
const parsedData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/dora-requirements-normalized.json'), 'utf8')
);

// Read ISO 27001 mappings
const isoMappings = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/iso27001-mappings.json'), 'utf8')
);

// Map chapters to DORA pillars
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
  return 'ICT_RISK_MANAGEMENT'; // Default
}

// Structure requirements
const structuredRequirements = parsedData.requirements.map((req, idx) => {
  const pillar = getPillarFromChapter(req.chapter || req.rawData?.Chapter);
  const isoMappingsForPillar = isoMappings.mappings[pillar]?.controls || [];
  
  return {
    requirementId: `DORA-REQ-${String(req.rawData?.['Requirement ID'] || idx + 1).padStart(3, '0')}`,
    chapter: req.chapter || req.rawData?.Chapter || null,
    article: req.article || req.rawData?.Article || null,
    paragraph: req.paragraph || req.rawData?.['Requirement ID'] || null,
    title: req.rawData?.Article || `Requirement ${req.rawData?.['Requirement ID'] || idx + 1}`,
    description: req.rawData?.Requirement || req.description || '',
    legalText: req.rawData?.Requirement || req.description || '',
    pillar: pillar,
    complianceStatus: mapComplianceStatus(req.compliance || req.rawData?.Compliance || 'Not Applicable'),
    notes: req.rawData?.Notes || null,
    iso27001Mappings: isoMappingsForPillar.map(m => ({
      control: m.iso27001Control,
      title: m.title,
      description: m.description,
      relevance: m.relevance,
    })),
  };
});

function mapComplianceStatus(status) {
  const mapping = {
    'Not Applicable': 'NOT_APPLICABLE',
    'Fully Compliant': 'FULLY_COMPLIANT',
    'Partially Compliant': 'PARTIALLY_COMPLIANT',
    'Not Compliant': 'NOT_COMPLIANT',
  };
  return mapping[status] || 'NOT_APPLICABLE';
}

// Create structured output
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

// Save structured JSON
const outputPath = path.join(__dirname, '../data/dora-requirements-final.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`✅ Created structured JSON with ${structuredRequirements.length} requirements`);
console.log(`📁 Saved to: ${outputPath}`);

// Show statistics
console.log('\n📊 Statistics by Pillar:');
Object.entries(output.metadata.pillars).forEach(([pillar, count]) => {
  console.log(`  ${pillar}: ${count} requirements`);
});

console.log('\n📋 Sample requirement:');
console.log(JSON.stringify(structuredRequirements[0], null, 2).substring(0, 500));

