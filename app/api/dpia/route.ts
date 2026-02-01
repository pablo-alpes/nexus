/**
 * DPIA (Data Protection Impact Assessment) API
 * GDPR Article 35 - DPIA management
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DPIA from '@/models/DPIA';
import { RegulationType } from '@/lib/regulations';

// Generate unique DPIA ID
function generateDPIAId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'DPIA-CHILE' : 'DPIA';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const { searchParams } = new URL(request.url);
    const regulationType = searchParams.get('regulation') || RegulationType.CHILEAN_PRIVACY;
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const query: any = { regulationType };
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;

    const dpias = await DPIA.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ dpias });
  } catch (error: any) {
    console.error('Error fetching DPIAs:', error);
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
      projectId,
      projectName,
      createdBy,
      necessityDescription,
      proportionalityAssessment,
      processingDescription,
      dataCategories,
      dataSubjectCategories,
      retentionPeriod,
      risks,
      overallRiskLevel,
      regulationType = RegulationType.CHILEAN_PRIVACY,
    } = body;

    if (!projectId || !projectName || !createdBy || !necessityDescription || !proportionalityAssessment || !processingDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const dpiaId = generateDPIAId(regulationType);

    const newDPIA = await DPIA.create({
      dpiaId,
      projectId,
      projectName,
      status: 'DRAFT',
      version: '1.0',
      createdBy,
      creationDate: new Date(),
      necessityDescription,
      proportionalityAssessment,
      processingDescription,
      dataCategories: dataCategories || [],
      dataSubjectCategories: dataSubjectCategories || [],
      retentionPeriod: retentionPeriod || 'Not specified',
      risks: risks || [],
      overallRiskLevel: overallRiskLevel || 'MEDIUM',
      mitigationMeasures: [],
      dataProtectionOfficerConsulted: false,
      dataSubjectsConsulted: false,
      residualRisks: [],
      approvalRequired: overallRiskLevel === 'HIGH' || overallRiskLevel === 'CRITICAL',
      regulationType,
    });

    return NextResponse.json({ dpia: newDPIA }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating DPIA:', error);
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
    const { dpiaId, ...updateData } = body;

    if (!dpiaId) {
      return NextResponse.json(
        { error: 'Missing dpiaId' },
        { status: 400 }
      );
    }

    // Handle date conversions
    if (updateData.creationDate) updateData.creationDate = new Date(updateData.creationDate);
    if (updateData.submissionDate) updateData.submissionDate = new Date(updateData.submissionDate);
    if (updateData.approvalDate) updateData.approvalDate = new Date(updateData.approvalDate);
    if (updateData.dpoConsultationDate) updateData.dpoConsultationDate = new Date(updateData.dpoConsultationDate);

    const updatedDPIA = await DPIA.findOneAndUpdate(
      { dpiaId },
      updateData,
      { new: true }
    );

    if (!updatedDPIA) {
      return NextResponse.json(
        { error: 'DPIA not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ dpia: updatedDPIA });
  } catch (error: any) {
    console.error('Error updating DPIA:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
