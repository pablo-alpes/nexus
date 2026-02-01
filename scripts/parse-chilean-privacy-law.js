/**
 * Improved Parser for Chilean Privacy Law (Ley 21.719)
 * 
 * This parser extracts a hierarchical structure:
 * - Artículos (Articles) - main requirements
 * - Incisos (Numbered paragraphs) - sub-requirements
 * - Literales (Lettered items) - sub-sub-requirements
 * - Nested numbering (2.1, 2.1.1, etc.) - deeper levels
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../data');
const INPUT_FILE = path.join(OUTPUT_DIR, 'chilean-privacy-law-raw.json');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'chilean-privacy-requirements.json');

/**
 * Clean HTML entities and normalize text
 */
function cleanText(text) {
  if (!text) return '';
  
  // Decode HTML entities
  text = text
    .replace(/&#xE1;/g, 'á')
    .replace(/&#xE9;/g, 'é')
    .replace(/&#xED;/g, 'í')
    .replace(/&#xF3;/g, 'ó')
    .replace(/&#xFA;/g, 'ú')
    .replace(/&#xF1;/g, 'ñ')
    .replace(/&#xC1;/g, 'Á')
    .replace(/&#xC9;/g, 'É')
    .replace(/&#xCD;/g, 'Í')
    .replace(/&#xD3;/g, 'Ó')
    .replace(/&#xDA;/g, 'Ú')
    .replace(/&#xD1;/g, 'Ñ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#xB0;/g, '°');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Parse hierarchical structure from law text
 */
function parseHierarchicalStructure(text) {
  const articles = [];
  
  // Clean text first to decode HTML entities
  text = cleanText(text);

  // Pattern to match articles: "Artículo X" or "Art. X" or "Artículo X bis/ter/quater/etc"
  const articlePattern = /(?:Artículo|Art\.?)\s+(\d+)(?:\s+(bis|ter|quater|quinquies|sexies|septies|octies|nonies))?[\.:-]\s*([^]*?)(?=(?:Artículo|Art\.?)\s+\d+|Título|DISPOSICIONES|$)/gi;
  
  let match;
  
  while ((match = articlePattern.exec(text)) !== null) {
    const articleNum = match[1];
    const articleModifier = match[2] || '';
    const articleContent = match[3].trim();
    
    const fullArticleNum = articleModifier ? `${articleNum} ${articleModifier}` : articleNum;
    
    // Parse the article content for hierarchical structure
    const structure = parseArticleContent(articleContent, articleNum, articleModifier);
    
    articles.push({
      articleNumber: articleNum,
      articleModifier: articleModifier,
      fullArticleNumber: fullArticleNum,
      content: articleContent,
      structure: structure,
    });
  }
  
  return articles;
}

/**
 * Parse article content to extract incisos, literales, and nested numbering
 */
function parseArticleContent(content, articleNum, articleModifier) {
  const structure = {
    mainText: '',
    incisos: [],
    literales: [],
    nested: [],
  };
  
  // Split by incisos (numbered paragraphs: "1.", "2.", "3.", etc.)
  const incisoPattern = /(?:^|\n)\s*((?:\d+[\.\)]|Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|Séptimo|Octavo|Noveno|Décimo)[\.\)]?)\s+([^]*?)(?=(?:^|\n)\s*(?:\d+[\.\)]|Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|Séptimo|Octavo|Noveno|Décimo|[a-z]\)|Artículo|$))/gim;
  
  let incisoMatch;
  let hasIncisos = false;
  
  while ((incisoMatch = incisoPattern.exec(content)) !== null) {
    hasIncisos = true;
    const incisoNum = incisoMatch[1].trim();
    const incisoText = cleanText(incisoMatch[2].trim());
    
    // Check if this inciso has literales (a), b), c), etc.)
    const literales = extractLiterales(incisoText);
    
    // Check if this inciso has nested numbering (2.1, 2.1.1, etc.)
    const nested = extractNestedNumbering(incisoText);
    
    structure.incisos.push({
      number: incisoNum,
      text: incisoText,
      literales: literales,
      nested: nested,
    });
  }
  
  // If no incisos found, the whole content is the main text
  if (!hasIncisos) {
    // Check for literales directly in the article
    const literales = extractLiterales(content);
    if (literales.length > 0) {
      structure.literales = literales;
      // Remove literales from main text
      content = content.replace(/[a-z]\)\s+[^]*?(?=[a-z]\)|$)/gi, '').trim();
    }
    structure.mainText = cleanText(content);
  } else {
    // Extract main text before first inciso
    const firstIncisoIndex = content.search(/(?:^|\n)\s*(?:\d+[\.\)]|Primero|Segundo)/im);
    if (firstIncisoIndex > 0) {
      structure.mainText = cleanText(content.substring(0, firstIncisoIndex).trim());
    }
  }
  
  return structure;
}

/**
 * Extract literales (lettered items: a), b), c), etc.)
 */
function extractLiterales(text) {
  const literales = [];
  const literalPattern = /([a-z])\)\s+([^]*?)(?=[a-z]\)|$|(?:\d+[\.\)]|Primero|Segundo|Artículo))/gim;
  
  let literalMatch;
  while ((literalMatch = literalPattern.exec(text)) !== null) {
    const literalLetter = literalMatch[1].toLowerCase();
    const literalText = cleanText(literalMatch[2].trim());
    
    if (literalText.length > 10) {
      literales.push({
        letter: literalLetter,
        text: literalText,
      });
    }
  }
  
  return literales;
}

/**
 * Extract nested numbering (2.1, 2.1.1, 2.1.1.1, etc.)
 */
function extractNestedNumbering(text) {
  const nested = [];
  const nestedPattern = /(\d+(?:\.\d+)+)[\.\)]\s+([^]*?)(?=\d+(?:\.\d+)+[\.\)]|$|[a-z]\)|Artículo)/gim;
  
  let nestedMatch;
  while ((nestedMatch = nestedPattern.exec(text)) !== null) {
    const nestedNum = nestedMatch[1];
    const nestedText = cleanText(nestedMatch[2].trim());
    
    if (nestedText.length > 10) {
      nested.push({
        number: nestedNum,
        text: nestedText,
        level: nestedNum.split('.').length - 1,
      });
    }
  }
  
  return nested;
}

/**
 * Extract a title from text
 */
function extractTitle(text) {
  if (!text) return '';
  const firstSentence = text.split(/[\.!?]/)[0].trim();
  if (firstSentence.length > 20 && firstSentence.length < 150) {
    return firstSentence;
  }
  return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
}

/**
 * Flatten hierarchical structure into requirements array
 */
function flattenToRequirements(articles) {
  const requirements = [];
  
  for (const article of articles) {
    const articleReqId = `CHILE-ART-${article.articleNumber}${article.articleModifier ? '-' + article.articleModifier.toUpperCase() : ''}`;
    
    if (article.structure.mainText && article.structure.mainText.length > 20) {
      requirements.push({
        requirementId: articleReqId,
        parentRequirementId: null,
        article: `Artículo ${article.fullArticleNumber}`,
        paragraph: null,
        literal: null,
        nestedNumber: null,
        level: 0,
        title: extractTitle(article.structure.mainText),
        description: article.structure.mainText.substring(0, 500),
        legalText: article.structure.mainText,
        fullLegalText: article.content,
        pillar: null,
        pillarConfidence: null,
      });
    }
    
    // Process incisos
    for (const inciso of article.structure.incisos) {
      const incisoReqId = `${articleReqId}-INC-${inciso.number.replace(/[\.\)]/g, '')}`;
      
      let incisoText = inciso.text;
      inciso.literales.forEach(lit => {
        incisoText = incisoText.replace(new RegExp(`${lit.letter}\\)\\s+${lit.text.substring(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'), '');
      });
      incisoText = cleanText(incisoText.trim());
      
      if (incisoText.length > 20) {
        requirements.push({
          requirementId: incisoReqId,
          parentRequirementId: articleReqId,
          article: `Artículo ${article.fullArticleNumber}`,
          paragraph: inciso.number,
          literal: null,
          nestedNumber: null,
          level: 1,
          title: extractTitle(incisoText),
          description: incisoText.substring(0, 500),
          legalText: incisoText,
          fullLegalText: article.content,
          pillar: null,
          pillarConfidence: null,
        });
      }
      
      // Process literales
      for (const literal of inciso.literales) {
        const literalReqId = `${incisoReqId}-LIT-${literal.letter}`;
        
        requirements.push({
          requirementId: literalReqId,
          parentRequirementId: incisoReqId,
          article: `Artículo ${article.fullArticleNumber}`,
          paragraph: inciso.number,
          literal: literal.letter,
          nestedNumber: null,
          level: 2,
          title: extractTitle(literal.text),
          description: literal.text.substring(0, 500),
          legalText: literal.text,
          fullLegalText: article.content,
          pillar: null,
          pillarConfidence: null,
        });
      }
      
      // Process nested numbering
      for (const nested of inciso.nested) {
        const nestedReqId = `${incisoReqId}-NEST-${nested.number.replace(/\./g, '-')}`;
        
        requirements.push({
          requirementId: nestedReqId,
          parentRequirementId: incisoReqId,
          article: `Artículo ${article.fullArticleNumber}`,
          paragraph: inciso.number,
          literal: null,
          nestedNumber: nested.number,
          level: nested.level + 1,
          title: extractTitle(nested.text),
          description: nested.text.substring(0, 500),
          legalText: nested.text,
          fullLegalText: article.content,
          pillar: null,
          pillarConfidence: null,
        });
      }
    }
    
    // Process literales directly in article
    if (article.structure.incisos.length === 0) {
      for (const literal of article.structure.literales) {
        const literalReqId = `${articleReqId}-LIT-${literal.letter}`;
        
        requirements.push({
          requirementId: literalReqId,
          parentRequirementId: articleReqId,
          article: `Artículo ${article.fullArticleNumber}`,
          paragraph: null,
          literal: literal.letter,
          nestedNumber: null,
          level: 1,
          title: extractTitle(literal.text),
          description: literal.text.substring(0, 500),
          legalText: literal.text,
          fullLegalText: article.content,
          pillar: null,
          pillarConfidence: null,
        });
      }
    }
  }
  
  return requirements;
}

/**
 * Map requirements to pillars
 */
function mapToPillars(requirements) {
  const pillarKeywords = {
    LAWFULNESS_FAIRNESS: ['lícito', 'leal', 'legal', 'legítimo', 'lawful', 'fair', 'consentimiento', 'consent', 'base legal'],
    PURPOSE_LIMITATION: ['finalidad', 'propósito', 'objetivo', 'purpose', 'limitación', 'fines'],
    DATA_MINIMIZATION: ['necesario', 'adecuado', 'pertinente', 'mínimo', 'minimization', 'adequate', 'proporcionado'],
    PROPORTIONALITY: ['proporcional', 'proporción', 'proportional', 'proporcionalidad'],
    QUALITY: ['exacto', 'actualizado', 'preciso', 'calidad', 'quality', 'accurate', 'veraz', 'veracidad'],
    ACCOUNTABILITY: ['responsable', 'responsabilidad', 'accountability', 'responsable del tratamiento', 'delegado', 'encargado'],
    SECURITY: ['seguridad', 'medidas técnicas', 'medidas organizativas', 'security', 'technical measures', 'protección', 'confidencialidad'],
    TRANSPARENCY_CONFIDENTIALITY: ['transparencia', 'confidencialidad', 'información', 'transparency', 'confidentiality', 'derecho de acceso', 'derecho de rectificación'],
  };
  
  return requirements.map(req => {
    const text = (req.legalText || req.description || '').toLowerCase();
    let bestPillar = 'ACCOUNTABILITY';
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
      pillarConfidence: maxMatches > 0 ? (maxMatches >= 2 ? 'high' : 'medium') : 'low',
    };
  });
}

/**
 * Main parsing function
 */
function parseLaw() {
  console.log('🔍 Parsing Chilean Privacy Law with improved hierarchical parser...\n');
  
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`❌ Input file not found: ${INPUT_FILE}`);
      console.error('   Please run fetch-chilean-privacy-law.js first\n');
      process.exit(1);
    }
    
    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    const lawText = rawData.rawText || rawData.content || '';
    
    if (!lawText || lawText.length < 100) {
      console.error('❌ No valid law text found in input file\n');
      process.exit(1);
    }
    
    console.log(`📖 Processing ${lawText.length} characters of law text...\n`);
    
    console.log('📋 Extracting hierarchical structure...');
    const articles = parseHierarchicalStructure(lawText);
    console.log(`✅ Found ${articles.length} articles\n`);
    
    console.log('🔄 Flattening to requirements...');
    let requirements = flattenToRequirements(articles);
    console.log(`✅ Created ${requirements.length} requirements\n`);
    
    console.log('🗺️  Mapping to pillars...');
    const mappedRequirements = mapToPillars(requirements);
    console.log(`✅ Mapped ${mappedRequirements.length} requirements\n`);
    
    const output = {
      metadata: {
        regulation: 'CHILEAN_PRIVACY',
        lawName: 'Ley 21.719 - Protección de Datos Personales',
        source: rawData.metadata?.source || 'https://www.bcn.cl/leychile/navegar?idNorma=1209272',
        parsedAt: new Date().toISOString(),
        totalRequirements: mappedRequirements.length,
        totalArticles: articles.length,
        pillars: [...new Set(mappedRequirements.map(r => r.pillar))],
      },
      requirements: mappedRequirements.map(req => ({
        requirementId: req.requirementId,
        parentRequirementId: req.parentRequirementId,
        article: req.article,
        paragraph: req.paragraph,
        literal: req.literal,
        nestedNumber: req.nestedNumber,
        level: req.level,
        title: req.title,
        description: req.description,
        legalText: req.legalText,
        fullLegalText: req.fullLegalText,
        pillar: req.pillar,
        pillarConfidence: req.pillarConfidence,
        complianceStatus: 'NOT_APPLICABLE',
        applicableTo: [],
        iso27001Mappings: [],
        iso27701Mappings: [],
      })),
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`💾 Saved to: ${OUTPUT_FILE}\n`);
    
    console.log('📊 Summary:');
    console.log(`   Total articles: ${articles.length}`);
    console.log(`   Total requirements: ${mappedRequirements.length}`);
    
    const levelCounts = mappedRequirements.reduce((acc, r) => {
      acc[r.level] = (acc[r.level] || 0) + 1;
      return acc;
    }, {});
    console.log('   Requirements by level:');
    Object.entries(levelCounts).sort((a, b) => a[0] - b[0]).forEach(([level, count]) => {
      const levelName = level === '0' ? 'Articles' : level === '1' ? 'Incisos/Literales' : `Level ${level}`;
      console.log(`     ${levelName}: ${count}`);
    });
    
    const pillarCounts = mappedRequirements.reduce((acc, r) => {
      acc[r.pillar] = (acc[r.pillar] || 0) + 1;
      return acc;
    }, {});
    console.log('   Requirements by pillar:');
    Object.entries(pillarCounts).sort((a, b) => b[1] - a[1]).forEach(([pillar, count]) => {
      console.log(`     ${pillar}: ${count}`);
    });
    
    console.log('\n📋 Sample requirements:');
    mappedRequirements.slice(0, 5).forEach(req => {
      const hierarchy = [
        req.article,
        req.paragraph ? `Inciso ${req.paragraph}` : null,
        req.literal ? `Literal ${req.literal})` : null,
        req.nestedNumber ? `Nested ${req.nestedNumber}` : null,
      ].filter(Boolean).join(' > ');
      console.log(`   ${req.requirementId}: ${hierarchy}`);
      console.log(`      ${req.title.substring(0, 80)}...`);
    });
    
    console.log('\n✅ Parsing complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  parseLaw();
}

module.exports = { parseLaw, parseHierarchicalStructure, flattenToRequirements, mapToPillars };
