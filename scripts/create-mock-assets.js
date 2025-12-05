/**
 * Create mock assets for testing (JavaScript version for easier execution)
 */

const { connectDBLocal } = require('../lib/mongodb-local');
const { getTestUser } = require('../lib/test-mode');
const Asset = require('../models/Asset').default;
const Control = require('../models/Control').default;

const mockAssets = [
  // Critical Assets (Level 4)
  {
    assetId: 'ASSET-001',
    name: 'Core Banking System',
    description: 'Primary banking application handling all customer transactions and account management',
    assetType: 'APPLICATION',
    criticalityLevel: 4,
    owner: 'IT Operations',
    location: 'Primary Data Center',
  },
  {
    assetId: 'ASSET-002',
    name: 'Customer Database',
    description: 'Main customer database containing all personal and financial information',
    assetType: 'DATABASE',
    criticalityLevel: 4,
    owner: 'Data Management',
    location: 'Primary Data Center',
  },
  {
    assetId: 'ASSET-003',
    name: 'Payment Processing Gateway',
    description: 'Critical payment gateway handling all financial transactions',
    assetType: 'APPLICATION',
    criticalityLevel: 4,
    owner: 'Payment Services',
    location: 'Primary Data Center',
  },
  // High Criticality Assets (Level 3)
  {
    assetId: 'ASSET-004',
    name: 'Customer Portal',
    description: 'Web-based customer portal for account access and services',
    assetType: 'APPLICATION',
    criticalityLevel: 3,
    owner: 'Digital Services',
    location: 'Cloud Infrastructure',
  },
  {
    assetId: 'ASSET-005',
    name: 'Transaction Log Database',
    description: 'Database storing all transaction logs for audit and compliance',
    assetType: 'DATABASE',
    criticalityLevel: 3,
    owner: 'Compliance',
    location: 'Secondary Data Center',
  },
  {
    assetId: 'ASSET-006',
    name: 'Network Infrastructure',
    description: 'Core network infrastructure including routers, switches, and firewalls',
    assetType: 'NETWORK',
    criticalityLevel: 3,
    owner: 'Network Operations',
    location: 'Primary Data Center',
  },
  {
    assetId: 'ASSET-007',
    name: 'Identity Provider Service',
    description: 'Third-party identity and access management service',
    assetType: 'THIRD_PARTY_SERVICE',
    criticalityLevel: 3,
    owner: 'Security',
    location: 'Cloud Provider',
  },
  // Medium Criticality Assets (Level 2)
  {
    assetId: 'ASSET-008',
    name: 'Marketing Website',
    description: 'Public-facing marketing and information website',
    assetType: 'APPLICATION',
    criticalityLevel: 2,
    owner: 'Marketing',
    location: 'Cloud Infrastructure',
  },
  {
    assetId: 'ASSET-009',
    name: 'Analytics Database',
    description: 'Database for business intelligence and analytics',
    assetType: 'DATABASE',
    criticalityLevel: 2,
    owner: 'Business Intelligence',
    location: 'Cloud Infrastructure',
  },
  {
    assetId: 'ASSET-010',
    name: 'Email Service',
    description: 'Corporate email service provider',
    assetType: 'THIRD_PARTY_SERVICE',
    criticalityLevel: 2,
    owner: 'IT Operations',
    location: 'Cloud Provider',
  },
  {
    assetId: 'ASSET-011',
    name: 'Backup Storage System',
    description: 'Automated backup and recovery storage system',
    assetType: 'DATA_STORAGE',
    criticalityLevel: 2,
    owner: 'IT Operations',
    location: 'Secondary Data Center',
  },
  {
    assetId: 'ASSET-012',
    name: 'Security Information and Event Management (SIEM)',
    description: 'Security monitoring and event management tool',
    assetType: 'SECURITY_TOOL',
    criticalityLevel: 2,
    owner: 'Security',
    location: 'Cloud Infrastructure',
  },
  // Low Criticality Assets (Level 1)
  {
    assetId: 'ASSET-013',
    name: 'Internal Wiki',
    description: 'Internal knowledge base and documentation system',
    assetType: 'APPLICATION',
    criticalityLevel: 1,
    owner: 'IT Operations',
    location: 'Cloud Infrastructure',
  },
  {
    assetId: 'ASSET-014',
    name: 'Development Environment',
    description: 'Development and testing environment',
    assetType: 'INFRASTRUCTURE',
    criticalityLevel: 1,
    owner: 'Development',
    location: 'Cloud Infrastructure',
  },
  {
    assetId: 'ASSET-015',
    name: 'HR Management System',
    description: 'Human resources management application',
    assetType: 'APPLICATION',
    criticalityLevel: 1,
    owner: 'HR',
    location: 'Cloud Provider',
  },
];

async function createMockAssets() {
  try {
    await connectDBLocal();
    
    const testUser = getTestUser();
    console.log('🚀 Creating mock assets for test user...\n');

    const createdAssets = [];
    const errors = [];

    for (const assetData of mockAssets) {
      try {
        // Check if asset already exists
        const existing = await Asset.findOne({ assetId: assetData.assetId });
        
        if (existing) {
          console.log(`⏭️  Asset ${assetData.assetId} already exists, skipping...`);
          continue;
        }

        const asset = await Asset.create({
          ...assetData,
          userId: testUser.userId,
          controls: [], // Controls will be mapped when controls are created
        });

        createdAssets.push({
          assetId: asset.assetId,
          name: asset.name,
          criticalityLevel: asset.criticalityLevel,
        });

        console.log(`✅ Created ${assetData.assetId}: ${assetData.name} (Level ${assetData.criticalityLevel})`);
      } catch (error) {
        errors.push({ assetId: assetData.assetId, error: error.message });
        console.error(`❌ Failed to create ${assetData.assetId}:`, error.message);
      }
    }

    console.log(`\n✨ Created ${createdAssets.length} mock assets`);
    console.log(`📊 Breakdown:`);
    console.log(`   Level 4 (Critical): ${createdAssets.filter(a => a.criticalityLevel === 4).length}`);
    console.log(`   Level 3 (High): ${createdAssets.filter(a => a.criticalityLevel === 3).length}`);
    console.log(`   Level 2 (Medium): ${createdAssets.filter(a => a.criticalityLevel === 2).length}`);
    console.log(`   Level 1 (Low): ${createdAssets.filter(a => a.criticalityLevel === 1).length}`);
    
    if (errors.length > 0) {
      console.warn(`\n⚠️  ${errors.length} assets failed to create`);
    }

    return {
      created: createdAssets.length,
      errors: errors.length,
      assets: createdAssets,
    };
  } catch (error) {
    console.error('❌ Error creating mock assets:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createMockAssets()
    .then(result => {
      console.log('\n🎉 Mock assets setup complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to create mock assets:', error);
      process.exit(1);
    });
}

module.exports = { createMockAssets };

