import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Asset from '@/models/Asset';
import Control from '@/models/Control';
import { getAuthUser } from '@/lib/auth-helper';
import { ensureMockDataSetup } from '@/lib/auto-setup';

// GET all assets for user
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Auto-create mock assets if none exist (for testing)
    await ensureMockDataSetup();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = user;
    const searchParams = request.nextUrl.searchParams;
    const criticalityLevel = searchParams.get('criticalityLevel');
    const assetType = searchParams.get('assetType');
    
    const query: any = { userId: payload.userId };
    if (criticalityLevel) query.criticalityLevel = parseInt(criticalityLevel);
    if (assetType) query.assetType = assetType;
    
    // Local storage doesn't support populate
    const assets = await Asset.find(query, { criticalityLevel: -1, createdAt: -1 });
    
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
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = user;
    const body = await request.json();
    
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
    
    const assetData = {
      ...body,
      userId: payload.userId,
      controls: applicableControls.map(c => c._id || c.controlId || c),
      assetId: body.assetId || `ASSET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
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

