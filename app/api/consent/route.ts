/**
 * Consent Management API
 * Handles consent records for data processing activities
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Consent from '@/models/Consent';
import DataProcessingRegister from '@/models/DataProcessingRegister';
import { RegulationType } from '@/lib/regulations';

// Generate unique consent ID
function generateConsentId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'CONSENT-CHILE' : 'CONSENT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const { searchParams } = new URL(request.url);
    const regulationType = searchParams.get('regulation') || RegulationType.CHILEAN_PRIVACY;
    const processingActivityId = searchParams.get('processingActivityId');
    const dataSubjectEmail = searchParams.get('dataSubjectEmail');
    const consentStatus = searchParams.get('consentStatus');

    const query: any = { regulationType };
    if (processingActivityId) query.processingActivityId = processingActivityId;
    if (dataSubjectEmail) query.dataSubjectEmail = dataSubjectEmail;
    if (consentStatus) query.consentStatus = consentStatus;

    const consents = await Consent.find(query);
    
    // Sort by consent date (newest first)
    consents.sort((a, b) => {
      const aDate = new Date(a.consentDate).getTime();
      const bDate = new Date(b.consentDate).getTime();
      return bDate - aDate;
    });

    return NextResponse.json({ consents });
  } catch (error: any) {
    console.error('Error fetching consents:', error);
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
      dataSubjectEmail,
      dataSubjectName,
      dataSubjectId,
      processingActivityId,
      consentType,
      privacyPolicyVersion,
      consentMethod,
      legalBasis,
      legalBasisJustification,
      userJustification,
      purposeDescription,
      ipAddress,
      userAgent,
      evidence,
      regulationType = RegulationType.CHILEAN_PRIVACY,
      expiryDate,
    } = body;

    if (!dataSubjectEmail || !processingActivityId || !consentType || !privacyPolicyVersion) {
      return NextResponse.json(
        { error: 'Missing required fields: dataSubjectEmail, processingActivityId, consentType, privacyPolicyVersion' },
        { status: 400 }
      );
    }

    // Verify processing activity exists
    const processingActivity = await DataProcessingRegister.findOne({ activityId: processingActivityId });
    if (!processingActivity) {
      return NextResponse.json(
        { error: 'Processing activity not found' },
        { status: 404 }
      );
    }

    const consentId = generateConsentId(regulationType);

    const newConsent = await Consent.create({
      consentId,
      dataSubjectEmail,
      dataSubjectName,
      dataSubjectId,
      processingActivityId,
      consentType,
      consentStatus: 'GIVEN',
      consentDate: new Date(),
      privacyPolicyVersion,
      consentMethod: consentMethod || 'WEB_FORM',
      legalBasis: legalBasis || ['CONSENT'],
      legalBasisJustification,
      userJustification,
      purposeDescription,
      ipAddress,
      userAgent,
      evidence,
      regulationType,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    // Update consent count in processing activity
    await DataProcessingRegister.findOneAndUpdate(
      { activityId: processingActivityId },
      { $inc: { consentCount: 1 } }
    );

    return NextResponse.json({ consent: newConsent }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating consent:', error);
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
    const { consentId, action, ...updateData } = body;

    if (!consentId) {
      return NextResponse.json(
        { error: 'Missing consentId' },
        { status: 400 }
      );
    }

    // Handle withdrawal
    if (action === 'WITHDRAW') {
      const consent = await Consent.findOne({ consentId });
      if (!consent) {
        return NextResponse.json(
          { error: 'Consent not found' },
          { status: 404 }
        );
      }

      const updatedConsent = await Consent.findOneAndUpdate(
        { consentId },
        {
          consentStatus: 'WITHDRAWN',
          withdrawalDate: new Date(),
        },
        { new: true }
      );

      // Decrease consent count in processing activity
      await DataProcessingRegister.findOneAndUpdate(
        { activityId: consent.processingActivityId },
        { $inc: { consentCount: -1 } }
      );

      return NextResponse.json({ consent: updatedConsent });
    }

    // Regular update
    const updatedConsent = await Consent.findOneAndUpdate(
      { consentId },
      updateData,
      { new: true }
    );

    if (!updatedConsent) {
      return NextResponse.json(
        { error: 'Consent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ consent: updatedConsent });
  } catch (error: any) {
    console.error('Error updating consent:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
