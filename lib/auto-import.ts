/**
 * Auto-import utility for DORA requirements
 * This runs automatically when the application starts or when requirements are accessed
 */

import connectDB from './mongodb';
import { connectDBLocal } from './mongodb-local';
import DORARequirement from '@/models/DORARequirement';
import { ensureMockDataSetup } from './auto-setup';
import { ensureQuestionnaireSetup } from './auto-questionnaire';
import { ensureControlsSetup } from './auto-controls';
import { ensureMockQuestionnaireResponse } from './auto-questionnaire-response';
import fs from 'fs';
import path from 'path';

let importInProgress = false;
let importCompleted = false;

export async function ensureRequirementsImported(): Promise<void> {
  // Prevent multiple simultaneous imports
  if (importInProgress || importCompleted) {
    return;
  }

  try {
    await connectDBLocal(); // Use local storage if MongoDB not available
    
    // Check if requirements already exist
    const count = await DORARequirement.countDocuments();
    if (count > 0) {
      importCompleted = true;
      return;
    }

    importInProgress = true;
    console.log('No requirements found, starting auto-import...');
    
    await importRequirementsFromJSON();
    
    // Also setup mock assets, questionnaire, controls, and mock responses after requirements are imported
    await ensureMockDataSetup();
    await ensureQuestionnaireSetup();
    await ensureControlsSetup();
    await ensureMockQuestionnaireResponse();
    
    importCompleted = true;
    importInProgress = false;
  } catch (error: any) {
    console.error('Auto-import failed:', error.message);
    importInProgress = false;
  }
}

async function importRequirementsFromJSON(): Promise<void> {
  try {
    // Try to load from data directory
    const jsonPath = path.join(process.cwd(), 'data', 'dora-requirements-final.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.log('JSON file not found at:', jsonPath);
      console.log('Please run: node scripts/create-structured-json.js');
      return;
    }
    
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (!data.requirements || !Array.isArray(data.requirements)) {
      console.log('Invalid JSON structure');
      return;
    }
    
    console.log(`Importing ${data.requirements.length} requirements...`);
    
    const imported = [];
    const errors = [];
    
    for (const req of data.requirements) {
      try {
        const requirement = await DORARequirement.findOneAndUpdate(
          { requirementId: req.requirementId },
          {
            requirementId: req.requirementId,
            chapter: req.chapter,
            article: req.article,
            paragraph: req.paragraph,
            title: req.title,
            description: req.description,
            legalText: req.legalText || req.description,
            pillar: req.pillar,
            complianceStatus: req.complianceStatus || 'NOT_APPLICABLE',
            notes: req.notes,
            iso27001Mappings: req.iso27001Mappings || [],
          },
          { upsert: true, new: true }
        );
        
        imported.push(requirement.requirementId);
      } catch (error: any) {
        errors.push({ requirementId: req.requirementId, error: error.message });
      }
    }
    
    console.log(`✅ Import completed: ${imported.length} requirements imported`);
    
    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} requirements failed to import`);
      console.error('Errors:', errors.slice(0, 5)); // Show first 5 errors
    }
  } catch (error: any) {
    console.error('Import error:', error.message);
    throw error;
  }
}

