const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, '../DORA_Gap_Assessment_Template_v1.1.xlsx'));

// Focus on the "DORA Requirements" sheet
const worksheet = workbook.Sheets['DORA Requirements'];

// Get all cells to understand structure
const range = XLSX.utils.decode_range(worksheet['!ref']);

// Read raw data to find header row
let headerRow = -1;
let requirements = [];

// Try to find the header row (usually row with "Requirement", "Article", etc.)
for (let R = 0; R <= range.e.r; R++) {
  const row = [];
  for (let C = 0; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
    const cell = worksheet[cellAddress];
    if (cell) {
      const value = cell.v;
      row.push(value);
      // Check if this looks like a header row
      if (typeof value === 'string' && (
        value.toLowerCase().includes('requirement') ||
        value.toLowerCase().includes('article') ||
        value.toLowerCase().includes('chapter') ||
        value.toLowerCase().includes('control')
      )) {
        headerRow = R;
      }
    } else {
      row.push(null);
    }
  }
  
  if (headerRow === -1 && row.some(cell => cell && typeof cell === 'string' && cell.length > 0)) {
    // Store rows for analysis
    requirements.push(row);
  }
}

// If we found a header row, parse from there
if (headerRow >= 0) {
  console.log(`Found header at row ${headerRow + 1}`);
  
  // Get header row
  const header = [];
  for (let C = 0; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: C });
    const cell = worksheet[cellAddress];
    header.push(cell ? cell.v : `Column_${C}`);
  }
  
  console.log('Headers:', header);
  
  // Parse data rows
  const parsedRequirements = [];
  for (let R = headerRow + 1; R <= range.e.r; R++) {
    const row = {};
    let hasData = false;
    
    for (let C = 0; C < header.length; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      const value = cell ? cell.v : null;
      
      if (value !== null && value !== undefined && value !== '') {
        hasData = true;
      }
      
      const headerName = header[C] || `Column_${C}`;
      row[headerName] = value;
    }
    
    if (hasData) {
      parsedRequirements.push(row);
    }
  }
  
  console.log(`Parsed ${parsedRequirements.length} requirements`);
  
  // Save structured data
  const output = {
    metadata: {
      sourceFile: 'DORA_Gap_Assessment_Template_v1.1.xlsx',
      parsedAt: new Date().toISOString(),
      totalRequirements: parsedRequirements.length,
    },
    headers: header,
    requirements: parsedRequirements,
  };
  
  const outputPath = path.join(__dirname, '../data/dora-requirements-structured.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nStructured data saved to: ${outputPath}`);
  
  // Also save a sample
  if (parsedRequirements.length > 0) {
    console.log('\nSample requirement:');
    console.log(JSON.stringify(parsedRequirements[0], null, 2));
  }
} else {
  // Try alternative parsing - read as CSV-like structure
  console.log('Header row not found, trying alternative parsing...');
  
  // Read the sheet with header row detection
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    defval: null,
    header: 1, // Use first row as header
    raw: false 
  });
  
  console.log(`Found ${data.length} rows`);
  if (data.length > 0) {
    console.log('First few rows:');
    data.slice(0, 3).forEach((row, idx) => {
      console.log(`Row ${idx}:`, JSON.stringify(row).substring(0, 300));
    });
  }
  
  // Save raw structure
  const outputPath = path.join(__dirname, '../data/dora-requirements-raw.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nRaw data saved to: ${outputPath}`);
}

// Also parse dropdowns for compliance statuses
const dropdownSheet = workbook.Sheets['Dropdowns'];
const dropdownData = XLSX.utils.sheet_to_json(dropdownSheet);
console.log('\nDropdown values:', dropdownData);

