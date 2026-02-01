/**
 * Load All Data (Rules + Privacy Management)
 * Main script that loads all prepopulated data
 */

import loadPrivacyData from './load-all-privacy-data';

async function loadAllData() {
  try {
    console.log('🚀 Loading All Prepopulated Data\n');
    console.log('='.repeat(50));
    
    // Load Privacy Management Data
    console.log('\n📋 Step 1: Privacy Management Data\n');
    await loadPrivacyData();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All data loaded successfully!\n');
    
  } catch (error: any) {
    console.error('❌ Error loading data:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  loadAllData();
}

export default loadAllData;
