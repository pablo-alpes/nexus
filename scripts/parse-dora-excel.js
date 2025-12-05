const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, '../DORA_Gap_Assessment_Template_v1.1.xlsx'));

console.log('Sheet names:', workbook.SheetNames);

// Parse each sheet
const parsedData = {};

workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  parsedData[sheetName] = data;
  console.log(`Sheet "${sheetName}": ${data.length} rows`);
  
  // Show first row structure
  if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('First row sample:', JSON.stringify(data[0], null, 2).substring(0, 500));
  }
});

// Save to JSON
const outputPath = path.join(__dirname, '../data/dora-requirements.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(parsedData, null, 2));
console.log(`\nParsed data saved to: ${outputPath}`);

