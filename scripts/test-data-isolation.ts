/**
 * Test script to verify data isolation by organization/affiliate
 * This script simulates API calls to verify filtering works correctly
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
import { buildDataQuery } from '../lib/query-helpers';
import { UserRole } from '../models/Organization';

async function testDataIsolation() {
  console.log('🔍 Testing data isolation by organization/affiliate...\n');
  
  try {
    await connectDBLocal();
    
    // Get all users, organizations, and affiliates
    const users = await User.find({});
    const orgs = await Organization.find({});
    const affs = await Affiliate.find({});
    
    console.log(`📋 Found ${users.length} users, ${orgs.length} organizations, ${affs.length} affiliates\n`);
    
    if (users.length === 0 || orgs.length === 0) {
      console.log('⚠️  Not enough data to test. Please create users and organizations first.');
      process.exit(0);
    }
    
    // Test with first SuperAdmin user
    const superAdmin = users.find((u: any) => u.role === UserRole.SUPER_ADMIN);
    if (!superAdmin) {
      console.log('⚠️  No SuperAdmin found. Please create a SuperAdmin first.');
      process.exit(0);
    }
    
    const userContext = {
      userId: String(superAdmin._id),
      email: superAdmin.email,
      role: superAdmin.role,
      organizationId: superAdmin.organizationId ? String(superAdmin.organizationId) : undefined,
      affiliateId: superAdmin.affiliateId ? String(superAdmin.affiliateId) : undefined,
      permissions: superAdmin.permissions,
    };
    
    console.log(`👤 Testing with SuperAdmin: ${userContext.email}`);
    console.log(`   Organization: ${userContext.organizationId || 'NONE'}`);
    console.log(`   Affiliate: ${userContext.affiliateId || 'NONE'}\n`);
    
    // Test 1: Filter by organization
    if (orgs.length > 0) {
      const testOrg = orgs[0];
      console.log(`\n📊 Test 1: Filter by organization "${testOrg.name}" (${testOrg._id})`);
      
      const { query: orgQuery } = await buildDataQuery(userContext, {
        organizationId: String(testOrg._id),
      });
      
      console.log('   Query:', JSON.stringify(orgQuery, null, 2));
      
      const orgAssets = await Asset.find(orgQuery);
      const orgGaps = await GapAnalysis.find(orgQuery);
      const orgResponses = await QuestionnaireResponse.find(orgQuery);
      const orgRemediation = await RemediationPlan.find(orgQuery);
      const orgRoadmaps = await Roadmap.find(orgQuery);
      
      console.log(`   Results: ${orgAssets.length} assets, ${orgGaps.length} gap analyses, ${orgResponses.length} responses, ${orgRemediation.length} remediation plans, ${orgRoadmaps.length} roadmaps`);
    }
    
    // Test 2: Filter by affiliate
    if (affs.length > 0) {
      const testAff = affs[0];
      console.log(`\n📊 Test 2: Filter by affiliate "${testAff.name}" (${testAff._id})`);
      
      const { query: affQuery } = await buildDataQuery(userContext, {
        affiliateId: String(testAff._id),
      });
      
      console.log('   Query:', JSON.stringify(affQuery, null, 2));
      
      const affAssets = await Asset.find(affQuery);
      const affGaps = await GapAnalysis.find(affQuery);
      const affResponses = await QuestionnaireResponse.find(affQuery);
      const affRemediation = await RemediationPlan.find(affQuery);
      const affRoadmaps = await Roadmap.find(affQuery);
      
      console.log(`   Results: ${affAssets.length} assets, ${affGaps.length} gap analyses, ${affResponses.length} responses, ${affRemediation.length} remediation plans, ${affRoadmaps.length} roadmaps`);
    }
    
    // Test 3: No filter (should use user's organization)
    console.log(`\n📊 Test 3: No filter (should use user's organization)`);
    
    const { query: defaultQuery } = await buildDataQuery(userContext, {});
    
    console.log('   Query:', JSON.stringify(defaultQuery, null, 2));
    
    const defaultAssets = await Asset.find(defaultQuery);
    const defaultGaps = await GapAnalysis.find(defaultQuery);
    const defaultResponses = await QuestionnaireResponse.find(defaultQuery);
    const defaultRemediation = await RemediationPlan.find(defaultQuery);
    const defaultRoadmaps = await Roadmap.find(defaultQuery);
    
    console.log(`   Results: ${defaultAssets.length} assets, ${defaultGaps.length} gap analyses, ${defaultResponses.length} responses, ${defaultRemediation.length} remediation plans, ${defaultRoadmaps.length} roadmaps`);
    
    // Test 4: Regular user (non-SuperAdmin)
    const regularUser = users.find((u: any) => u.role !== UserRole.SUPER_ADMIN);
    if (regularUser) {
      console.log(`\n📊 Test 4: Regular user "${regularUser.email}"`);
      
      const regularUserContext = {
        userId: String(regularUser._id),
        email: regularUser.email,
        role: regularUser.role,
        organizationId: regularUser.organizationId ? String(regularUser.organizationId) : undefined,
        affiliateId: regularUser.affiliateId ? String(regularUser.affiliateId) : undefined,
        permissions: regularUser.permissions,
      };
      
      const { query: regularQuery } = await buildDataQuery(regularUserContext, {});
      
      console.log('   Query:', JSON.stringify(regularQuery, null, 2));
      
      const regularAssets = await Asset.find(regularQuery);
      const regularGaps = await GapAnalysis.find(regularQuery);
      const regularResponses = await QuestionnaireResponse.find(regularQuery);
      const regularRemediation = await RemediationPlan.find(regularQuery);
      const regularRoadmaps = await Roadmap.find(regularQuery);
      
      console.log(`   Results: ${regularAssets.length} assets, ${regularGaps.length} gap analyses, ${regularResponses.length} responses, ${regularRemediation.length} remediation plans, ${regularRoadmaps.length} roadmaps`);
    }
    
    console.log('\n✅ Test complete!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDataIsolation();

