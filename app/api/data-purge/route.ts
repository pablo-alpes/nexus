/**
 * Data Purge API
 * Manages data purging/retention activities
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DataPurge from '@/models/DataPurge';
import { RegulationType } from '@/lib/regulations';

// Generate unique purge ID
function generatePurgeId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'PURGE-CHILE' : 'PURGE';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const searchParams = request.nextUrl.searchParams;
    const regulationType = (searchParams.get('regulation') as RegulationType) || RegulationType.CHILEAN_PRIVACY;
    const processingActivityId = searchParams.get('processingActivityId');
    const status = searchParams.get('status');
    
    const query: any = { regulationType };
    if (processingActivityId) query.processingActivityId = processingActivityId;
    if (status) query.status = status;
    
    let purges;
    if (isLocalStorage()) {
      const DataPurgeModel = DataPurge as any;
      const allPurges = await DataPurgeModel.find(query);
      purges = allPurges.sort((a: any, b: any) => 
        new Date(b.createdAt || b._id).getTime() - new Date(a.createdAt || a._id).getTime()
      );
    } else {
      purges = await DataPurge.find(query).sort({ createdAt: -1 });
    }
    
    return NextResponse.json({ purges });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    const {
      processingActivityId,
      purgeType,
      dataTypes,
      dataVolume,
      dataLocations,
      dataOwner,
      scheduledDate,
      dueDate,
      purgeMethod,
      retentionCriteria,
      legalBasis,
      regulationType = RegulationType.CHILEAN_PRIVACY,
    } = body;
    
    const purgeId = generatePurgeId(regulationType);
    
    const purge = new DataPurge({
      purgeId,
      processingActivityId,
      purgeType,
      status: 'PENDING',
      dataTypes,
      dataVolume,
      dataLocations,
      dataOwner,
      scheduledDate: new Date(scheduledDate),
      dueDate: new Date(dueDate),
      purgeMethod,
      retentionCriteria,
      legalBasis,
      regulationType,
    });
    
    await purge.save();
    
    return NextResponse.json({ purge }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    const { purgeId, ...updates } = body;
    
    if (!purgeId) {
      return NextResponse.json(
        { error: 'purgeId is required' },
        { status: 400 }
      );
    }
    
    const purge = await DataPurge.findOneAndUpdate(
      { purgeId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!purge) {
      return NextResponse.json(
        { error: 'Purge not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ purge });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function isLocalStorage(): boolean {
  return process.env.USE_LOCAL_STORAGE === 'true' || !process.env.MONGODB_URI;
}
