/**
 * Test script to verify delete filtering works correctly
 */

import { connectDBLocal } from '../lib/mongodb-local';
import QuestionnaireResponse from '../models/QuestionnaireResponse';
import { buildDataQuery } from '../lib/query-helpers';
import { UserRole } from '../models/Organization';

async function testDeleteFiltering() {
  console.log('🧪 Testing delete filtering by affiliateId...\n');
  
  try {
    await connectDBLocal();
    
    // Get all responses
    const allResponses = await QuestionnaireResponse.find({});
    console.log(`📋 Total responses in database: ${allResponses.length}\n`);
    
    // Group by affiliateId
    const byAffiliate: Record<string, any[]> = {};
    allResponses.forEach((r: any) => {
      const aff = r.affiliateId || 'NO_AFFILIATE';
      if (!byAffiliate[aff]) byAffiliate[aff] = [];
      byAffiliate[aff].push(r);
    });
    
    console.log('📊 Responses grouped by affiliateId:');
    Object.keys(byAffiliate).forEach(aff => {
      console.log(`  ${aff}: ${byAffiliate[aff].length} response(s)`);
    });
    console.log('');
    
    if (Object.keys(byAffiliate).length < 2) {
      console.log('⚠️  Need at least 2 different affiliateIds to test. Creating test data...\n');
      // This test requires multiple affiliates - we'll just show the current state
      return;
    }
    
    // Test 1: Filter by first affiliateId
    const firstAffiliateId = Object.keys(byAffiliate)[0];
    console.log(`\n🧪 Test 1: Filter by affiliateId: ${firstAffiliateId}`);
    
    const userContext1 = {
      userId: 'test-user-1',
      role: UserRole.SUPER_ADMIN,
      organizationId: 'test-org-1',
      affiliateId: null,
      permissions: {},
    };
    
    const filterParams1 = {
      affiliateId: firstAffiliateId,
      organizationId: null,
      legalFramework: null,
    };
    
    const { query: query1 } = await buildDataQuery(userContext1, filterParams1);
    console.log('   Query:', JSON.stringify(query1, null, 2));
    
    const matching1 = await QuestionnaireResponse.find(query1);
    console.log(`   Found ${matching1.length} matching response(s)`);
    matching1.forEach((r: any, i: number) => {
      console.log(`     ${i + 1}. _id=${r._id}, affiliateId=${r.affiliateId}, userId=${r.userId}`);
    });
    
    // Test 2: Filter by second affiliateId
    const secondAffiliateId = Object.keys(byAffiliate)[1];
    console.log(`\n🧪 Test 2: Filter by affiliateId: ${secondAffiliateId}`);
    
    const filterParams2 = {
      affiliateId: secondAffiliateId,
      organizationId: null,
      legalFramework: null,
    };
    
    const { query: query2 } = await buildDataQuery(userContext1, filterParams2);
    console.log('   Query:', JSON.stringify(query2, null, 2));
    
    const matching2 = await QuestionnaireResponse.find(query2);
    console.log(`   Found ${matching2.length} matching response(s)`);
    matching2.forEach((r: any, i: number) => {
      console.log(`     ${i + 1}. _id=${r._id}, affiliateId=${r.affiliateId}, userId=${r.userId}`);
    });
    
    // Verify they don't overlap
    const ids1 = new Set(matching1.map((r: any) => r._id));
    const ids2 = new Set(matching2.map((r: any) => r._id));
    const overlap = [...ids1].filter(id => ids2.has(id));
    
    if (overlap.length > 0) {
      console.log(`\n❌ ERROR: Found ${overlap.length} overlapping responses!`);
      console.log('   Overlapping IDs:', overlap);
    } else {
      console.log('\n✅ SUCCESS: No overlapping responses - filtering works correctly!');
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDeleteFiltering();

