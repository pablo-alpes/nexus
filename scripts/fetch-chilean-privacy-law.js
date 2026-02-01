/**
 * Fetch and parse Chilean Privacy Law (Ley 21.719)
 * Source: https://www.bcn.cl/leychile/navegar?idNorma=1209272
 * 
 * This script attempts to fetch the law text and parse it into structured requirements
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'chilean-privacy-law-raw.json');
const STRUCTURED_FILE = path.join(OUTPUT_DIR, 'chilean-privacy-requirements.json');

// The law URL
const LAW_URL = 'https://www.bcn.cl/leychile/navegar?idNorma=1209272';

/**
 * Fetch HTML content from URL
 */
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Parse HTML to extract law text
 * This is a basic parser - may need refinement based on actual HTML structure
 */
function parseLawText(html) {
  // Remove scripts and styles
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract main content
  const contentMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                       html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                       html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  if (!contentMatch) {
    // Fallback: extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Clean HTML tags
  let text = contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Extract articles and paragraphs from law text
 */
function extractRequirements(text) {
  const requirements = [];
  
  // Pattern to match articles: "Artículo X" or "Art. X"
  const articlePattern = /(?:Artículo|Art\.?)\s+(\d+)[\.:]?\s*([^]*?)(?=(?:Artículo|Art\.?)\s+\d+|$)/gi;
  
  let match;
  let articleCount = 0;
  
  while ((match = articlePattern.exec(text)) !== null) {
    articleCount++;
    const articleNum = match[1];
    const articleContent = match[2].trim();
    
    // Split into paragraphs (numbered or lettered)
    const paragraphs = articleContent.split(/(?:^|\n)\s*(?:[a-z]\)|\d+\.)\s+/m);
    
    paragraphs.forEach((para, idx) => {
      const paraText = para.trim();
      if (paraText.length > 20) { // Only include substantial paragraphs
        requirements.push({
          article: `Artículo ${articleNum}`,
          paragraph: idx > 0 ? `${idx}` : null,
          text: paraText,
          rawText: paraText,
        });
      }
    });
    
    // If no paragraphs found, add the whole article
    if (paragraphs.length === 1 && articleContent.length > 20) {
      requirements.push({
        article: `Artículo ${articleNum}`,
        paragraph: null,
        text: articleContent,
        rawText: articleContent,
      });
    }
  }
  
  // If no articles found, try to split by common patterns
  if (requirements.length === 0) {
    // Try splitting by numbered sections
    const sections = text.split(/(?:^|\n)\s*(\d+)[\.\)]\s+/m);
    sections.forEach((section, idx) => {
      if (idx > 0 && section.trim().length > 20) {
        requirements.push({
          article: `Sección ${sections[idx - 1]}`,
          paragraph: null,
          text: section.trim(),
          rawText: section.trim(),
        });
      }
    });
  }
  
  return requirements;
}

/**
 * Map requirements to pillars based on content analysis
 */
function mapToPillars(requirements) {
  const pillarKeywords = {
    LAWFULNESS_FAIRNESS: ['lícito', 'leal', 'legal', 'legítimo', 'lawful', 'fair'],
    PURPOSE_LIMITATION: ['finalidad', 'propósito', 'objetivo', 'purpose', 'limitación'],
    DATA_MINIMIZATION: ['necesario', 'adecuado', 'pertinente', 'mínimo', 'minimization', 'adequate'],
    PROPORTIONALITY: ['proporcional', 'proporción', 'proportional'],
    QUALITY: ['exacto', 'actualizado', 'preciso', 'calidad', 'quality', 'accurate'],
    ACCOUNTABILITY: ['responsable', 'responsabilidad', 'accountability', 'responsable del tratamiento'],
    SECURITY: ['seguridad', 'medidas técnicas', 'medidas organizativas', 'security', 'technical measures'],
    TRANSPARENCY_CONFIDENTIALITY: ['transparencia', 'confidencialidad', 'información', 'transparency', 'confidentiality'],
  };
  
  return requirements.map(req => {
    const text = req.text.toLowerCase();
    let bestPillar = 'SECURITY'; // Default
    let maxMatches = 0;
    
    for (const [pillar, keywords] of Object.entries(pillarKeywords)) {
      const matches = keywords.filter(kw => text.includes(kw.toLowerCase())).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestPillar = pillar;
      }
    }
    
    return {
      ...req,
      pillar: bestPillar,
      pillarConfidence: maxMatches > 0 ? 'high' : 'low',
    };
  });
}

/**
 * Structure requirements into final format
 */
function structureRequirements(requirements) {
  return requirements.map((req, idx) => {
    // Extract title from first sentence
    const firstSentence = req.text.split(/[\.!?]/)[0].trim();
    const title = firstSentence.length > 100 
      ? firstSentence.substring(0, 100) + '...'
      : firstSentence;
    
    return {
      requirementId: `CHILE-REQ-${String(idx + 1).padStart(3, '0')}`,
      article: req.article,
      paragraph: req.paragraph,
      title: title || `Requirement ${idx + 1}`,
      description: req.text.substring(0, 500), // First 500 chars
      legalText: req.text,
      pillar: req.pillar,
      pillarConfidence: req.pillarConfidence,
      complianceStatus: 'NOT_APPLICABLE',
      applicableTo: [],
      iso27001Mappings: [], // Will be mapped later
    };
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Fetching Chilean Privacy Law (Ley 21.719)...\n');
  
  try {
    // Try to fetch from URL
    console.log(`Fetching from: ${LAW_URL}`);
    const html = await fetchURL(LAW_URL);
    console.log(`✅ Fetched ${html.length} characters\n`);
    
    // Parse HTML
    console.log('📝 Parsing law text...');
    const lawText = parseLawText(html);
    console.log(`✅ Extracted ${lawText.length} characters of text\n`);
    
    // Save raw data
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
      metadata: {
        source: LAW_URL,
        fetchedAt: new Date().toISOString(),
        textLength: lawText.length,
      },
      rawText: lawText,
      html: html.substring(0, 10000), // First 10k chars of HTML for reference
    }, null, 2));
    console.log(`💾 Saved raw data to: ${OUTPUT_FILE}\n`);
    
    // Extract requirements
    console.log('🔎 Extracting requirements...');
    let requirements = extractRequirements(lawText);
    console.log(`✅ Found ${requirements.length} potential requirements\n`);
    
    // If extraction failed, create a placeholder structure
    if (requirements.length === 0) {
      console.log('⚠️  No requirements extracted. Creating placeholder structure...');
      console.log('   Note: Manual parsing may be required.\n');
      
      // Create placeholder based on known structure of Ley 21.719
      requirements = [
        {
          article: 'Artículo 1',
          paragraph: null,
          text: 'Objeto de la ley - Protección de datos personales',
          rawText: lawText.substring(0, 1000),
        },
      ];
    }
    
    // Map to pillars
    console.log('🗺️  Mapping to pillars...');
    const mappedRequirements = mapToPillars(requirements);
    console.log(`✅ Mapped ${mappedRequirements.length} requirements to pillars\n`);
    
    // Structure requirements
    console.log('📋 Structuring requirements...');
    const structured = structureRequirements(mappedRequirements);
    console.log(`✅ Structured ${structured.length} requirements\n`);
    
    // Check if existing file has more requirements - preserve it if so
    let existingRequirements = [];
    let existingMetadata = null;
    if (fs.existsSync(STRUCTURED_FILE)) {
      try {
        const existing = JSON.parse(fs.readFileSync(STRUCTURED_FILE, 'utf8'));
        existingRequirements = existing.requirements || [];
        existingMetadata = existing.metadata;
        console.log(`📦 Found existing file with ${existingRequirements.length} requirements`);
        
        // Preserve existing file if it has more requirements than new parse
        // OR if it has a reasonable number (>= 50) and new parse is very low (< 10)
        if (existingRequirements.length > structured.length || 
            (existingRequirements.length >= 50 && structured.length < 10)) {
          console.log(`⚠️  Existing file has ${existingRequirements.length} requirements, new parse only has ${structured.length}`);
          console.log(`   Preserving existing file to avoid data loss.\n`);
          console.log('💡 To force re-parse, delete the file first:');
          console.log(`   rm ${STRUCTURED_FILE}\n`);
          console.log('💡 To export requirements from database to JSON:');
          console.log(`   npm run export:requirements\n`);
          
          // Print summary of existing data
          console.log('📊 Existing data summary:');
          if (existingMetadata) {
            console.log(`   Total requirements: ${existingMetadata.totalRequirements || existingRequirements.length}`);
            if (existingMetadata.pillars) {
              console.log(`   Pillars: ${existingMetadata.pillars.join(', ')}`);
            }
            if (existingMetadata.exportedAt) {
              console.log(`   Last exported: ${existingMetadata.exportedAt}`);
            }
          }
          console.log('\n✅ Preserved existing requirements file!\n');
          return;
        }
      } catch (e) {
        console.log(`⚠️  Could not read existing file: ${e.message}`);
      }
    }
    
    // Save structured requirements
    const output = {
      metadata: {
        regulation: 'CHILEAN_PRIVACY',
        lawName: 'Ley 21.719 - Protección de Datos Personales',
        source: LAW_URL,
        parsedAt: new Date().toISOString(),
        totalRequirements: structured.length,
        pillars: Object.keys(mappedRequirements.reduce((acc, r) => {
          acc[r.pillar] = true;
          return acc;
        }, {})),
      },
      requirements: structured,
    };
    
    fs.writeFileSync(STRUCTURED_FILE, JSON.stringify(output, null, 2));
    console.log(`💾 Saved structured requirements to: ${STRUCTURED_FILE}\n`);
    
    // Print summary
    console.log('📊 Summary:');
    console.log(`   Total requirements: ${structured.length}`);
    const pillarCounts = structured.reduce((acc, r) => {
      acc[r.pillar] = (acc[r.pillar] || 0) + 1;
      return acc;
    }, {});
    console.log('   Requirements by pillar:');
    Object.entries(pillarCounts).forEach(([pillar, count]) => {
      console.log(`     ${pillar}: ${count}`);
    });
    console.log('\n✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Note: The law text may need to be manually downloaded and parsed.');
    console.error('   You can download the law from the URL and save it as HTML, then modify this script.\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, extractRequirements, mapToPillars, structureRequirements };
