/**
 * Data Subject Requests API
 * Handles data subject rights requests (access, rectification, deletion, portability, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DataSubjectRequest from '@/models/DataSubjectRequest';
import { RegulationType } from '@/lib/regulations';

// Calculate due date (30 days from now for Chilean law)
function calculateDueDate(): Date {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  return dueDate;
}

// Generate unique request ID
function generateRequestId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'DSR-CHILE' : 'DSR';
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
    const requestType = searchParams.get('requestType');

    const query: any = { regulationType };
    if (status) query.status = status;
    if (requestType) query.requestType = requestType;

    const requests = await DataSubjectRequest.find(query);
    
    // Sort by due date (urgent first)
    requests.sort((a: any, b: any) => {
      const aDate = new Date(a.dueDate).getTime();
      const bDate = new Date(b.dueDate).getTime();
      return aDate - bDate;
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error fetching data subject requests:', error);
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
      requestType,
      dataSubjectName,
      dataSubjectEmail,
      dataSubjectId,
      description,
      requestedData,
      regulationType = RegulationType.CHILEAN_PRIVACY,
      relatedProcessingActivities,
    } = body;

    if (!requestType || !dataSubjectName || !dataSubjectEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: requestType, dataSubjectName, dataSubjectEmail' },
        { status: 400 }
      );
    }

    const requestId = generateRequestId(regulationType);
    const dueDate = calculateDueDate();

    const newRequest = await DataSubjectRequest.create({
      requestId,
      requestType,
      status: 'PENDING',
      dataSubjectName,
      dataSubjectEmail,
      dataSubjectId,
      description,
      requestedData: requestedData || [],
      dueDate,
      regulationType,
      relatedProcessingActivities: relatedProcessingActivities || [],
    });

    return NextResponse.json({ request: newRequest }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating data subject request:', error);
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
    const { requestId, ...updateData } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Missing requestId' },
        { status: 400 }
      );
    }

    // If status is being updated to COMPLETED, set completedDate
    if (updateData.status === 'COMPLETED' && !updateData.completedDate) {
      updateData.completedDate = new Date();
    }

    const updatedRequest = await DataSubjectRequest.findOneAndUpdate(
      { requestId },
      updateData,
      { new: true }
    );

    if (!updatedRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: updatedRequest });
  } catch (error: any) {
    console.error('Error updating data subject request:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
