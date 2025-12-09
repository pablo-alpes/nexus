/**
 * Migration script to add organizationId, affiliateId, and legalFramework
 * to existing data records
 * 
 * Usage: tsx scripts/migrate-multi-tenant.ts
 */

import { connectDBLocal } from '../lib/mongodb-local';
import Asset from '../models/Asset';
import GapAnalysis from '../models/GapAnalysis';
import QuestionnaireResponse from '../models/QuestionnaireResponse';
import RemediationPlan from '../models/RemediationPlan';
import Roadmap from '../models/Roadmap';
import User from '../models/User';

async function migrateData() {
  console.log('🔄 Starting multi-tenant data migration...\n');
  
  try {
    await connectDBLocal();
    
    // Get all users to map userId to organizationId/affiliateId
    const users = await User.find({});
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(String(user._id), {
        organizationId: user.organizationId ? String(user.organizationId) : null,
        affiliateId: user.affiliateId ? String(user.affiliateId) : null,
      });
    });
    
    console.log(`📋 Found ${users.length} users\n`);
    
    // Migrate Assets
    console.log('📦 Migrating Assets...');
    // Find all assets that need migration (missing any of the three fields)
    const allAssets = await Asset.find({});
    const assets = allAssets.filter(asset => 
      !asset.organizationId || !asset.affiliateId || !asset.legalFramework
    );
    
    let assetsUpdated = 0;
    for (const asset of assets) {
      const userId = String(asset.userId);
      const userInfo = userMap.get(userId);
      
      const update: any = {};
      if (!asset.organizationId && userInfo?.organizationId) {
        update.organizationId = String(userInfo.organizationId);
      }
      if (!asset.affiliateId && userInfo?.affiliateId) {
        update.affiliateId = String(userInfo.affiliateId);
      }
      if (!asset.legalFramework) {
        update.legalFramework = 'DORA';
      }
      
      if (Object.keys(update).length > 0) {
        await Asset.findOneAndUpdate({ _id: asset._id }, update);
        assetsUpdated++;
      }
    }
    console.log(`   ✅ Updated ${assetsUpdated} assets (out of ${allAssets.length} total)\n`);
    
    // Migrate GapAnalysis
    console.log('🔍 Migrating GapAnalysis...');
    const allGapAnalyses = await GapAnalysis.find({});
    const gapAnalyses = allGapAnalyses.filter(gap => 
      !gap.organizationId || !gap.affiliateId || !gap.legalFramework
    );
    
    let gapAnalysesUpdated = 0;
    for (const gap of gapAnalyses) {
      const userId = String(gap.userId);
      const userInfo = userMap.get(userId);
      
      const update: any = {};
      if (!gap.organizationId && userInfo?.organizationId) {
        update.organizationId = String(userInfo.organizationId);
      }
      if (!gap.affiliateId && userInfo?.affiliateId) {
        update.affiliateId = String(userInfo.affiliateId);
      }
      if (!gap.legalFramework) {
        update.legalFramework = 'DORA';
      }
      
      if (Object.keys(update).length > 0) {
        await GapAnalysis.findOneAndUpdate({ _id: gap._id }, update);
        gapAnalysesUpdated++;
      }
    }
    console.log(`   ✅ Updated ${gapAnalysesUpdated} gap analyses (out of ${allGapAnalyses.length} total)\n`);
    
    // Migrate QuestionnaireResponse
    console.log('📝 Migrating QuestionnaireResponse...');
    const allQuestionnaireResponses = await QuestionnaireResponse.find({});
    const questionnaireResponses = allQuestionnaireResponses.filter(response => 
      !response.organizationId || !response.affiliateId || !response.legalFramework
    );
    
    let questionnaireResponsesUpdated = 0;
    for (const response of questionnaireResponses) {
      const userId = String(response.userId);
      const userInfo = userMap.get(userId);
      
      const update: any = {};
      if (!response.organizationId && userInfo?.organizationId) {
        update.organizationId = String(userInfo.organizationId);
      }
      if (!response.affiliateId && userInfo?.affiliateId) {
        update.affiliateId = String(userInfo.affiliateId);
      }
      if (!response.legalFramework) {
        update.legalFramework = 'DORA';
      }
      
      if (Object.keys(update).length > 0) {
        await QuestionnaireResponse.findOneAndUpdate({ _id: response._id }, update);
        questionnaireResponsesUpdated++;
      }
    }
    console.log(`   ✅ Updated ${questionnaireResponsesUpdated} questionnaire responses (out of ${allQuestionnaireResponses.length} total)\n`);
    
    // Migrate RemediationPlan
    console.log('🔧 Migrating RemediationPlan...');
    const allRemediationPlans = await RemediationPlan.find({});
    const remediationPlans = allRemediationPlans.filter(plan => 
      !plan.organizationId || !plan.affiliateId || !plan.legalFramework
    );
    
    let remediationPlansUpdated = 0;
    for (const plan of remediationPlans) {
      const userId = String(plan.userId);
      const userInfo = userMap.get(userId);
      
      const update: any = {};
      if (!plan.organizationId && userInfo?.organizationId) {
        update.organizationId = String(userInfo.organizationId);
      }
      if (!plan.affiliateId && userInfo?.affiliateId) {
        update.affiliateId = String(userInfo.affiliateId);
      }
      if (!plan.legalFramework) {
        update.legalFramework = 'DORA';
      }
      
      if (Object.keys(update).length > 0) {
        await RemediationPlan.findOneAndUpdate({ _id: plan._id }, update);
        remediationPlansUpdated++;
      }
    }
    console.log(`   ✅ Updated ${remediationPlansUpdated} remediation plans (out of ${allRemediationPlans.length} total)\n`);
    
    // Migrate Roadmap
    console.log('🗺️  Migrating Roadmap...');
    const allRoadmaps = await Roadmap.find({});
    const roadmaps = allRoadmaps.filter(roadmap => 
      !roadmap.organizationId || !roadmap.affiliateId || !roadmap.legalFramework
    );
    
    let roadmapsUpdated = 0;
    for (const roadmap of roadmaps) {
      const userId = String(roadmap.userId);
      const userInfo = userMap.get(userId);
      
      const update: any = {};
      if (!roadmap.organizationId && userInfo?.organizationId) {
        update.organizationId = String(userInfo.organizationId);
      }
      if (!roadmap.affiliateId && userInfo?.affiliateId) {
        update.affiliateId = String(userInfo.affiliateId);
      }
      if (!roadmap.legalFramework) {
        update.legalFramework = 'DORA';
      }
      
      if (Object.keys(update).length > 0) {
        await Roadmap.findOneAndUpdate({ _id: roadmap._id }, update);
        roadmapsUpdated++;
      }
    }
    console.log(`   ✅ Updated ${roadmapsUpdated} roadmaps (out of ${allRoadmaps.length} total)\n`);
    
    console.log('='.repeat(80));
    console.log('✅ Migration complete!');
    console.log('='.repeat(80));
    console.log(`\nSummary:`);
    console.log(`  - Assets: ${assetsUpdated}`);
    console.log(`  - Gap Analyses: ${gapAnalysesUpdated}`);
    console.log(`  - Questionnaire Responses: ${questionnaireResponsesUpdated}`);
    console.log(`  - Remediation Plans: ${remediationPlansUpdated}`);
    console.log(`  - Roadmaps: ${roadmapsUpdated}`);
    console.log(`\nTotal records updated: ${assetsUpdated + gapAnalysesUpdated + questionnaireResponsesUpdated + remediationPlansUpdated + roadmapsUpdated}\n`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

migrateData();

