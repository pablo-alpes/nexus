/**
 * Auto-setup utility - creates mock data for testing
 */

import { ensureRequirementsImported } from './auto-import';
import { connectDBLocal } from './mongodb-local';
import Asset from '@/models/Asset';
import { getTestUser } from './test-mode';

let setupCompleted = false;
let setupInProgress = false;

export async function ensureMockDataSetup(): Promise<void> {
  if (setupInProgress || setupCompleted) {
    return;
  }

  try {
    await connectDBLocal();
    
    // Check if assets already exist
    const assetCount = await Asset.countDocuments();
    if (assetCount > 0) {
      setupCompleted = true;
      return;
    }

    setupInProgress = true;
    console.log('No assets found, creating mock assets...');
    
    await createMockAssets();
    
    setupCompleted = true;
    setupInProgress = false;
  } catch (error: any) {
    console.error('Mock data setup failed:', error.message);
    setupInProgress = false;
  }
}

async function createMockAssets(): Promise<void> {
  const testUser = getTestUser();
  
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

  const created = [];
  const errors = [];

  for (const assetData of mockAssets) {
    try {
      // Check if asset already exists
      const existing = await Asset.findOne({ assetId: assetData.assetId });
      if (existing) {
        continue;
      }

      const asset = await Asset.create({
        ...assetData,
        userId: testUser.userId,
        controls: [], // Controls will be mapped when controls are created
      });

      created.push(asset.assetId || assetData.assetId);
    } catch (error: any) {
      errors.push({ assetId: assetData.assetId, error: error.message });
      console.error(`Failed to create asset ${assetData.assetId}:`, error.message);
    }
  }

  console.log(`✅ Created ${created.length} mock assets`);
  
  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} assets failed to create`);
  }
}

