/**
 * Test script to verify data separation by organization/affiliate
 */

import { connectDBLocal } from '../lib/mongodb-local';
import Asset from '../models/Asset';
import GapAnalysis from '../models/GapAnalysis';
import QuestionnaireResponse from '../models/QuestionnaireResponse';
import RemediationPlan from '../models/RemediationPlan';
import Roadmap from '../models/Roadmap';
import User from '../models/User';
import Organization from '../models/Organization';
import Affiliate from '../models/Affiliate';

async function testDataSeparation() {
  console.log('🔍 Testing data separation...\n');
  
  try {
    await connectDBLocal();
    
    // Get all users
    const users = await User.find({});
    console.log(`📋 Found ${users.length} users:`);
    users.forEach((user: any) => {
      console.log(`  - ${user.email}: orgId=${user.organizationId || 'NONE'}, affId=${user.affiliateId || 'NONE'}`);
    });
    console.log('');
    
    // Get all organizations and affiliates
    const orgs = await Organization.find({});
    const affs = await Affiliate.find({});
    console.log(`🏢 Found ${orgs.length} organizations, ${affs.length} affiliates\n`);
    
    // Check each data type
    const dataTypes = [
      { name: 'Assets', model: Asset },
      { name: 'GapAnalysis', model: GapAnalysis },
      { name: 'QuestionnaireResponse', model: QuestionnaireResponse },
      { name: 'RemediationPlan', model: RemediationPlan },
      { name: 'Roadmap', model: Roadmap },
    ];
    
    for (const { name, model } of dataTypes) {
      console.log(`📊 ${name}:`);
      const allItems = await model.find({});
      console.log(`  Total: ${allItems.length}`);
      
      // Group by organizationId/affiliateId
      const byOrg: Record<string, number> = {};
      const byAff: Record<string, number> = {};
      const withoutOrg = allItems.filter((item: any) => !item.organizationId && !item.affiliateId);
      
      allItems.forEach((item: any) => {
        if (item.organizationId) {
          const orgId = String(item.organizationId);
          byOrg[orgId] = (byOrg[orgId] || 0) + 1;
        }
        if (item.affiliateId) {
          const affId = String(item.affiliateId);
          byAff[affId] = (byAff[affId] || 0) + 1;
        }
      });
      
      if (Object.keys(byOrg).length > 0) {
        console.log(`  By Organization:`);
        Object.entries(byOrg).forEach(([orgId, count]) => {
          console.log(`    ${orgId}: ${count}`);
        });
      }
      if (Object.keys(byAff).length > 0) {
        console.log(`  By Affiliate:`);
        Object.entries(byAff).forEach(([affId, count]) => {
          console.log(`    ${affId}: ${count}`);
        });
      }
      if (withoutOrg.length > 0) {
        console.log(`  ⚠️  ${withoutOrg.length} items without organizationId/affiliateId`);
      }
      console.log('');
    }
    
    console.log('✅ Test complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDataSeparation();

