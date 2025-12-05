const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, '../DORA_Gap_Assessment_Template_v1.1.xlsx'));

// Parse "DORA Requirements" sheet
const worksheet = workbook.Sheets['DORA Requirements'];
const range = XLSX.utils.decode_range(worksheet['!ref']);

console.log(`Sheet range: ${worksheet['!ref']}`);
console.log(`Total rows: ${range.e.r + 1}, Total cols: ${range.e.c + 1}`);

// Read all rows to understand structure
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

// Find the actual header row by looking for common column names
let headerRowIndex = -1;
const possibleHeaders = ['Chapter', 'Article', 'Paragraph', 'Requirement', 'Control', 'Compliance'];

for (let R = 0; R < Math.min(20, allRows.length); R++) {
  const row = allRows[R];
  const rowText = row.map(c => String(c || '')).join(' ').toLowerCase();
  
  // Check if this row contains header-like text
  if (possibleHeaders.some(h => rowText.includes(h.toLowerCase()))) {
    headerRowIndex = R;
    console.log(`Found potential header at row ${R + 1}`);
    console.log('Row content:', row.filter(c => c !== null).slice(0, 10));
    break;
  }
}

// If no header found, try reading with different options
let requirements = [];

if (headerRowIndex >= 0) {
  // Use found header row
  const headers = allRows[headerRowIndex].map((h, idx) => {
    if (h && String(h).trim()) return String(h).trim();
    return `Column_${idx}`;
  });
  
  console.log('Headers:', headers.filter(h => !h.startsWith('Column_')));
  
  // Parse data rows
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
} else {
  // Try reading as array of arrays and manually parse
  console.log('Trying manual parsing...');
  
  // Look for patterns: Chapter, Article, Paragraph numbers
  for (let R = 0; R < allRows.length; R++) {
    const row = allRows[R];
    const rowValues = row.filter(v => v !== null && v !== undefined);
    
    // Check if row has meaningful data (more than 2 non-null values)
    if (rowValues.length >= 3) {
      // Try to identify structure
      const req = {
        rawRow: R + 1,
        data: rowValues,
      };
      
      // Look for chapter/article patterns
      rowValues.forEach((val, idx) => {
        const str = String(val);
        if (str.includes('CHAPTER') || str.includes('Chapter')) {
          req.chapter = str;
        }
        if (str.includes('Article') || str.match(/^Article\s+\d+/i)) {
          req.article = str;
        }
        if (typeof val === 'number' && val > 0 && val < 1000) {
          req.paragraph = val;
        }
        if (str.length > 50 && !req.description) {
          req.description = str;
        }
        if (['Fully Compliant', 'Partially Compliant', 'Not Compliant', 'Not Applicable'].includes(str)) {
          req.compliance = str;
        }
      });
      
      if (req.chapter || req.article || req.description) {
        requirements.push(req);
      }
    }
  }
}

console.log(`\nParsed ${requirements.length} requirements`);

// Show sample
if (requirements.length > 0) {
  console.log('\nSample requirements (first 3):');
  requirements.slice(0, 3).forEach((req, idx) => {
    console.log(`\nRequirement ${idx + 1}:`);
    console.log(JSON.stringify(req, null, 2).substring(0, 500));
  });
}

// Save parsed data
const output = {
  metadata: {
    sourceFile: 'DORA_Gap_Assessment_Template_v1.1.xlsx',
    parsedAt: new Date().toISOString(),
    totalRequirements: requirements.length,
    complianceStatuses: ['Not Applicable', 'Fully Compliant', 'Partially Compliant', 'Not Compliant'],
  },
  requirements: requirements,
};

const outputPath = path.join(__dirname, '../data/dora-requirements-parsed.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nParsed data saved to: ${outputPath}`);

// Also create a normalized version
const normalized = requirements.map((req, idx) => {
  // Extract structured data
  const normalizedReq = {
    requirementId: `DORA-REQ-${String(idx + 1).padStart(3, '0')}`,
    chapter: req.chapter || req.Chapter || null,
    article: req.article || req.Article || null,
    paragraph: req.paragraph || req.Paragraph || null,
    description: req.description || req.Description || req['DORA Gap Assessment template'] || null,
    compliance: req.compliance || req.Compliance || 'Not Applicable',
    rawData: req,
  };
  
  return normalizedReq;
});

const normalizedPath = path.join(__dirname, '../data/dora-requirements-normalized.json');
fs.writeFileSync(normalizedPath, JSON.stringify({
  metadata: output.metadata,
  requirements: normalized,
}, null, 2));
console.log(`Normalized data saved to: ${normalizedPath}`);

