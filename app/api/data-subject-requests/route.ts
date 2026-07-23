/**
 * Data Subject Requests API
 * Tenant-scoped: cabinet → client isolation for DSAR / deletion / modification requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DataSubjectRequest from '@/models/DataSubjectRequest';
import { RegulationType } from '@/lib/regulations';
import { getAuthUserContext } from '@/lib/auth-helper';
import { extractFilterParams, buildDataQuery, resolveTenantStamp } from '@/lib/query-helpers';
import { canModifyClientData } from '@/lib/permissions';

function calculateDueDate(): Date {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  return dueDate;
}

function generateRequestId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'DSR-CHILE' : 'DSR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const ctx = await getAuthUserContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filterParams = extractFilterParams(request);
    if (!filterParams.regulationType) {
      filterParams.regulationType = RegulationType.CHILEAN_PRIVACY;
    }

    const { query } = await buildDataQuery(ctx, filterParams);
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const requestType = searchParams.get('requestType');
    if (status) query.status = status;
    if (requestType) query.requestType = requestType;

    const requests = await DataSubjectRequest.find(query);

    requests.sort((a: any, b: any) => {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error fetching data subject requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const ctx = await getAuthUserContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      clientId,
      cabinetId,
    } = body;

    if (!requestType || !dataSubjectName || !dataSubjectEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: requestType, dataSubjectName, dataSubjectEmail' },
        { status: 400 }
      );
    }

    const stamp = resolveTenantStamp(ctx, { clientId, cabinetId });
    if (!stamp.clientId) {
      return NextResponse.json(
        { error: 'clientId is required — select a client in the portfolio' },
        { status: 400 }
      );
    }

    const access = canModifyClientData(ctx, stamp.clientId);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

    const requestId = generateRequestId(regulationType);
    const dueDate = calculateDueDate();

    const newRequest = await DataSubjectRequest.create({
      requestId,
      userId: ctx.userId,
      cabinetId: stamp.cabinetId,
      clientId: stamp.clientId,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const ctx = await getAuthUserContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, ...updateData } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
    }

    const filterParams = extractFilterParams(request);
    const { query } = await buildDataQuery(ctx, filterParams);
    query.requestId = requestId;

    if (updateData.status === 'COMPLETED' && !updateData.completedDate) {
      updateData.completedDate = new Date();
    }

    // Never allow moving a request across tenants via update
    delete updateData.cabinetId;
    delete updateData.clientId;
    delete updateData.userId;

    const existing = await DataSubjectRequest.findOne(query);
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const updatedRequest = await DataSubjectRequest.findOneAndUpdate(
      { requestId, ...(existing.clientId ? { clientId: existing.clientId } : {}) },
      updateData,
      { new: true }
    );

    return NextResponse.json({ request: updatedRequest });
  } catch (error: any) {
    console.error('Error updating data subject request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
