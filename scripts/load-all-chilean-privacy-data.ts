/**
 * Load All Chilean Privacy Data
 * Loads both Legal Compliance (requirements, questionnaire) and Privacy Management data
 */

import { execSync } from 'child_process';
import { connectDBLocal } from '../lib/mongodb-local';
import { RequirementOperations } from '../lib/model-operations';
import Question from '../models/Question';
import DataSubjectRequest from '../models/DataSubjectRequest';
import Consent from '../models/Consent';
import DataProcessingRegister from '../models/DataProcessingRegister';
import BreachNotification from '../models/BreachNotification';
import ThirdPartyProcessor from '../models/ThirdPartyProcessor';
import PrivacyByDesignProject from '../models/PrivacyByDesignProject';
import DPIA from '../models/DPIA';
import DataGovernance from '../models/DataGovernance';
import DataPurge from '../models/DataPurge';
import { RegulationType } from '../lib/regulations';
import { prepopulateData } from './prepopulate-privacy-data';

async function checkLegalComplianceData() {
  await connectDBLocal();
  
  // Use RequirementOperations to find requirements (handles both Requirement and DORARequirement)
  const requirements = await RequirementOperations.findByRegulation(RegulationType.CHILEAN_PRIVACY);
  const questions = await Question.find({ regulationType: RegulationType.CHILEAN_PRIVACY });

  return {
    requirements: requirements.length,
    questions: questions.length,
  };
}

async function checkPrivacyManagementData() {
  await connectDBLocal();
  
  const [requests, consents, activities, breaches, processors, projects, dpias, governance, purges] = await Promise.all([
    DataSubjectRequest.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    Consent.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    DataProcessingRegister.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    BreachNotification.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    ThirdPartyProcessor.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    PrivacyByDesignProject.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    DPIA.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    DataGovernance.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    DataPurge.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
  ]);

  return {
    requests: requests.length,
    consents: consents.length,
    activities: activities.length,
    breaches: breaches.length,
    processors: processors.length,
    projects: projects.length,
    dpias: dpias.length,
    governance: governance.length,
    purges: purges.length,
  };
}

async function loadLegalComplianceData() {
  try {
    console.log('📚 Loading Legal Compliance Data...\n');
    
    // Check if data already exists
    const existing = await checkLegalComplianceData();
    
    if (existing.requirements > 0 || existing.questions > 0) {
      console.log('📊 Existing Legal Compliance data found:');
      console.log(`   - Requirements: ${existing.requirements}`);
      console.log(`   - Questions: ${existing.questions}\n`);
      
      // If we have good data in DB but JSON file is outdated, export DB to JSON
      if (existing.requirements >= 50) {
        const fs = require('fs');
        const path = require('path');
        const requirementsFile = path.join(__dirname, '../data/chilean-privacy-requirements.json');
        
        if (fs.existsSync(requirementsFile)) {
          try {
            const fileData = JSON.parse(fs.readFileSync(requirementsFile, 'utf8'));
            const fileCount = fileData.requirements?.length || 0;
            
            if (fileCount < existing.requirements) {
              console.log(`⚠️  JSON file has ${fileCount} requirements but DB has ${existing.requirements}`);
              console.log('   Exporting database requirements to JSON to preserve data...\n');
              const { default: exportRequirements } = await import('./export-requirements-to-json');
              await exportRequirements();
              
              // Also export mappings
              try {
                const { default: exportMappings } = await import('./export-mappings-to-json');
                console.log('📤 Also exporting mappings to preserve them...\n');
                await exportMappings();
              } catch (e) {
                console.log('⚠️  Could not export mappings:', (e as Error).message);
              }
            }
          } catch (e) {
            console.log(`⚠️  Could not check JSON file: ${e.message}`);
          }
        }
        
        if (existing.requirements >= 50 && existing.questions >= 20) {
          console.log('✅ Legal Compliance data already loaded. Skipping setup...\n');
          return;
        }
      }
    }

    // Check if requirements file exists and has good data
    const fs = require('fs');
    const path = require('path');
    const requirementsFile = path.join(__dirname, '../data/chilean-privacy-requirements.json');
    
    let shouldRunFetch = true;
    if (fs.existsSync(requirementsFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(requirementsFile, 'utf8'));
        const existingCount = existing.requirements?.length || 0;
        console.log(`📄 Found existing requirements file with ${existingCount} requirements`);
        
        // Only re-fetch if we have very few requirements (less than 10)
        if (existingCount >= 10) {
          console.log(`✅ Existing file has sufficient requirements (${existingCount}). Skipping fetch to preserve data.\n`);
          shouldRunFetch = false;
        } else {
          console.log(`⚠️  Existing file has only ${existingCount} requirements. Will re-fetch.\n`);
        }
      } catch (e) {
        console.log(`⚠️  Could not read existing file: ${e.message}. Will re-fetch.\n`);
      }
    }
    
    // Run the setup script (but skip fetch if we have good data)
    if (shouldRunFetch) {
      console.log('🔄 Running legal compliance setup (including fetch)...\n');
      execSync('npm run setup:chilean-privacy', { stdio: 'inherit' });
    } else {
      // Only run import and questionnaire creation
      console.log('🔄 Running legal compliance import (skipping fetch to preserve data)...\n');
      execSync('tsx scripts/import-chilean-privacy-requirements.js && tsx scripts/create-chilean-privacy-questionnaire.js', { stdio: 'inherit' });
    }
    
    // Verify data was loaded
    const final = await checkLegalComplianceData();
    console.log('\n✅ Legal Compliance Data Loaded:');
    console.log(`   - Requirements: ${final.requirements}`);
    console.log(`   - Questions: ${final.questions}\n`);
    
  } catch (error: any) {
    console.error('❌ Error loading legal compliance data:', error.message);
    throw error;
  }
}

async function loadPrivacyManagementData() {
  try {
    console.log('📦 Loading Privacy Management Data...\n');
    
    // Check if data already exists
    const existing = await checkPrivacyManagementData();
    const totalExisting = Object.values(existing).reduce((sum, count) => sum + count, 0);
    
    if (totalExisting > 0) {
      console.log('📊 Existing Privacy Management data found:');
      console.log(`   - Data Subject Requests: ${existing.requests}`);
      console.log(`   - Consents: ${existing.consents}`);
      console.log(`   - Processing Activities: ${existing.activities}`);
      console.log(`   - Breach Notifications: ${existing.breaches}`);
      console.log(`   - Third Party Processors: ${existing.processors}`);
      console.log(`   - Privacy Projects: ${existing.projects}`);
      console.log(`   - DPIAs: ${existing.dpias}`);
      console.log(`   - Data Governance: ${existing.governance}`);
      console.log(`   - Data Purges: ${existing.purges}\n`);
      
      if (totalExisting >= 75) {
        console.log('✅ Privacy Management data already loaded. Skipping...\n');
        return;
      }
    }

    // Run the prepopulate script
    console.log('🔄 Running privacy management prepopulation...\n');
    await prepopulateData();
    
    // Verify data was loaded
    const final = await checkPrivacyManagementData();
    console.log('\n✅ Privacy Management Data Loaded:');
    console.log(`   - Data Subject Requests: ${final.requests}`);
    console.log(`   - Consents: ${final.consents}`);
    console.log(`   - Processing Activities: ${final.activities}`);
    console.log(`   - Breach Notifications: ${final.breaches}`);
    console.log(`   - Third Party Processors: ${final.processors}`);
    console.log(`   - Privacy Projects: ${final.projects}`);
    console.log(`   - DPIAs: ${final.dpias}`);
    console.log(`   - Data Governance: ${final.governance}`);
    console.log(`   - Data Purges: ${final.purges}\n`);
    
  } catch (error: any) {
    console.error('❌ Error loading privacy management data:', error.message);
    throw error;
  }
}

async function loadAllChileanPrivacyData() {
  try {
    console.log('🚀 Starting complete Chilean Privacy data load...\n');
    console.log('=' .repeat(60));
    console.log('This will load:');
    console.log('  1. Legal Compliance (Requirements & Questionnaire)');
    console.log('  2. Privacy Management (Operational Records)');
    console.log('=' .repeat(60) + '\n');
    
    // Load Legal Compliance first
    await loadLegalComplianceData();
    
    // Then load Privacy Management
    await loadPrivacyManagementData();
    
    console.log('=' .repeat(60));
    console.log('✅ All Chilean Privacy data loaded successfully!');
    console.log('=' .repeat(60));
    
  } catch (error: any) {
    console.error('❌ Error loading data:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  loadAllChileanPrivacyData();
}

export default loadAllChileanPrivacyData;
