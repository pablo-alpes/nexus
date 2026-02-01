/**
 * Data Processing Register API
 * Records of Processing Activities (ROPA)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DataProcessingRegister from '@/models/DataProcessingRegister';
import { RegulationType } from '@/lib/regulations';

// Generate unique activity ID
function generateActivityId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'DPR-CHILE' : 'DPR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const { searchParams } = new URL(request.url);
    const regulationType = searchParams.get('regulation') || RegulationType.CHILEAN_PRIVACY;
    const status = searchParams.get('status');
    const pillar = searchParams.get('pillar');
    const legalBasis = searchParams.get('legalBasis');

    const query: any = { regulationType };
    if (status) query.status = status;
    if (pillar) query.pillar = pillar;
    if (legalBasis) query.legalBasis = legalBasis;

    const activities = await DataProcessingRegister.find(query);
    
    // Sort by activity name (manual sort for LocalStorage)
    if (Array.isArray(activities)) {
      activities.sort((a: any, b: any) => {
        const aName = a.activityName || '';
        const bName = b.activityName || '';
        return aName.localeCompare(bName);
      });
    }

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Error fetching data processing activities:', error);
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
      activityName,
      description,
      purpose,
      legalBasis,
      dataCategories,
      dataSubjectCategories,
      recipients,
      thirdCountryTransfers,
      retentionPeriod,
      securityMeasures,
      responsiblePerson,
      dataProtectionOfficer,
      relatedRequirements,
      relatedControls,
      consentRequired,
      regulationType = RegulationType.CHILEAN_PRIVACY,
      pillar,
      nextReviewDate,
    } = body;

    if (!activityName || !description || !purpose || !legalBasis || !dataCategories || !dataSubjectCategories || !retentionPeriod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const activityId = generateActivityId(regulationType);

    const newActivity = await DataProcessingRegister.create({
      activityId,
      activityName,
      description,
      purpose,
      legalBasis,
      dataCategories: Array.isArray(dataCategories) ? dataCategories : [dataCategories],
      dataSubjectCategories: Array.isArray(dataSubjectCategories) ? dataSubjectCategories : [dataSubjectCategories],
      recipients: recipients || [],
      thirdCountryTransfers: thirdCountryTransfers || [],
      retentionPeriod,
      securityMeasures: securityMeasures || [],
      status: 'ACTIVE',
      responsiblePerson,
      dataProtectionOfficer,
      relatedRequirements: relatedRequirements || [],
      relatedControls: relatedControls || [],
      consentRequired: consentRequired || false,
      consentCount: 0,
      lastReviewDate: new Date(),
      nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
      regulationType,
      pillar,
    });

    return NextResponse.json({ activity: newActivity }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating data processing activity:', error);
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
    const { activityId, ...updateData } = body;

    if (!activityId) {
      return NextResponse.json(
        { error: 'Missing activityId' },
        { status: 400 }
      );
    }

    // Update lastReviewDate if status is being changed
    if (updateData.status && updateData.status !== 'UNDER_REVIEW') {
      updateData.lastReviewDate = new Date();
    }

    const updatedActivity = await DataProcessingRegister.findOneAndUpdate(
      { activityId },
      updateData,
      { new: true }
    );

    if (!updatedActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ activity: updatedActivity });
  } catch (error: any) {
    console.error('Error updating data processing activity:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
