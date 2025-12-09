import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Asset from '@/models/Asset';
import Control from '@/models/Control';
import { getAuthUser, getAuthUserContext } from '@/lib/auth-helper';
import { ensureMockDataSetup } from '@/lib/auto-setup';
import { buildDataQuery, extractFilterParams } from '@/lib/query-helpers';

// GET all assets for user
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Auto-create mock assets if none exist (for testing)
    await ensureMockDataSetup();
    
    // Check auth
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const filterParams = extractFilterParams(request);
    const { query } = await buildDataQuery(userContext, filterParams);
    
    console.log('📦 Loading assets with query:', JSON.stringify(query, null, 2));
    
    const searchParams = request.nextUrl.searchParams;
    const criticalityLevel = searchParams.get('criticalityLevel');
    const assetType = searchParams.get('assetType');
    
    if (criticalityLevel) query.criticalityLevel = parseInt(criticalityLevel);
    if (assetType) query.assetType = assetType;
    
    // Local storage doesn't support populate
    const assets = await Asset.find(query, { criticalityLevel: -1, createdAt: -1 });
    
    console.log(`📦 Found ${assets.length} assets`);
    
    return NextResponse.json({ assets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create asset and map controls
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check auth
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const filterParams = extractFilterParams(request);
    
    // Find applicable controls based on asset type and criticality
    const applicableControls = await Control.find({
      $and: [
        {
          $or: [
            { controlType: 'TRANSVERSAL' },
            {
              controlType: 'SPECIFIC',
              applicableAssetTypes: body.assetType,
            },
          ],
        },
        {
          $or: [
            { minCriticalityLevel: { $exists: false } },
            { minCriticalityLevel: { $lte: body.criticalityLevel } },
          ],
        },
      ],
    });
    
    // Ensure organizationId and affiliateId are set from user context if not in filter params
    // Always convert to String for consistency
    const organizationId = filterParams?.organizationId || userContext.organizationId;
    const affiliateId = filterParams?.affiliateId || userContext.affiliateId;
    const legalFramework = filterParams?.legalFramework || 'DORA';
    
    const assetData: any = {
      ...body,
      userId: String(userContext.userId),
      legalFramework,
      controls: applicableControls.map(c => c._id || c.controlId || c),
      assetId: body.assetId || `ASSET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    // Always add organizationId/affiliateId from user context or filter params
    if (organizationId) {
      assetData.organizationId = String(organizationId);
    }
    if (affiliateId) {
      assetData.affiliateId = String(affiliateId);
    }
    
    console.log('💾 Creating asset with data:', { 
      userId: assetData.userId, 
      organizationId: assetData.organizationId, 
      affiliateId: assetData.affiliateId,
      legalFramework: assetData.legalFramework,
      userContext: {
        organizationId: userContext.organizationId,
        affiliateId: userContext.affiliateId,
      },
      filterParams,
    });
    
    const asset = await Asset.create(assetData);
    
    return NextResponse.json({
      asset,
      mappedControls: applicableControls.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update asset
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = user;
    const body = await request.json();
    
    const asset = await Asset.findOneAndUpdate(
      { _id: body._id, userId: payload.userId },
      body,
      { new: true }
    );
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ asset });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

