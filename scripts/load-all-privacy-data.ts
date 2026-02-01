/**
 * Load All Privacy Management Data
 * Automatically loads all prepopulated privacy data
 */

import { execSync } from 'child_process';
import { connectDBLocal } from '../lib/mongodb-local';
import DataSubjectRequest from '../models/DataSubjectRequest';
import Consent from '../models/Consent';
import DataProcessingRegister from '../models/DataProcessingRegister';
import BreachNotification from '../models/BreachNotification';
import ThirdPartyProcessor from '../models/ThirdPartyProcessor';
import PrivacyByDesignProject from '../models/PrivacyByDesignProject';
import DPIA from '../models/DPIA';
import DataGovernance from '../models/DataGovernance';
import { RegulationType } from '../lib/regulations';

async function checkDataExists() {
  await connectDBLocal();
  
  const [requests, consents, activities, breaches, processors, projects, dpias, governance] = await Promise.all([
    DataSubjectRequest.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    Consent.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    DataProcessingRegister.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    BreachNotification.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    ThirdPartyProcessor.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    PrivacyByDesignProject.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    DPIA.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
    DataGovernance.find({ regulationType: RegulationType.CHILEAN_PRIVACY }),
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
  };
}

async function loadPrivacyData() {
  try {
    console.log('📦 Loading Privacy Management Data...\n');
    
    // Check if data already exists
    const existing = await checkDataExists();
    const totalExisting = Object.values(existing).reduce((sum, count) => sum + count, 0);
    
    if (totalExisting > 0) {
      console.log('📊 Existing data found:');
      console.log(`   - Data Subject Requests: ${existing.requests}`);
      console.log(`   - Consents: ${existing.consents}`);
      console.log(`   - Processing Activities: ${existing.activities}`);
      console.log(`   - Breach Notifications: ${existing.breaches}`);
      console.log(`   - Third Party Processors: ${existing.processors}`);
      console.log(`   - Privacy Projects: ${existing.projects}`);
      console.log(`   - DPIAs: ${existing.dpias}`);
      console.log(`   - Data Governance: ${existing.governance}\n`);
      
      if (totalExisting >= 70) {
        console.log('✅ Privacy data already loaded. Skipping...\n');
        return;
      }
    }

    // Run the prepopulate script
    console.log('🔄 Running prepopulate script...\n');
    execSync('npm run prepopulate:privacy', { stdio: 'inherit' });
    
    // Verify data was loaded
    const final = await checkDataExists();
    console.log('\n✅ Privacy Management Data Loaded:');
    console.log(`   - Data Subject Requests: ${final.requests}`);
    console.log(`   - Consents: ${final.consents}`);
    console.log(`   - Processing Activities: ${final.activities}`);
    console.log(`   - Breach Notifications: ${final.breaches}`);
    console.log(`   - Third Party Processors: ${final.processors}`);
    console.log(`   - Privacy Projects: ${final.projects}`);
    console.log(`   - DPIAs: ${final.dpias}`);
    console.log(`   - Data Governance: ${final.governance}\n`);
    
  } catch (error: any) {
    console.error('❌ Error loading privacy data:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  loadPrivacyData();
}

export default loadPrivacyData;
