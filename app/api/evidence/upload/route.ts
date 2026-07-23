import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import Evidence from '@/models/Evidence';
import { getAuthUserContext } from '@/lib/auth-helper';
import { resolveTenantStamp, extractFilterParams } from '@/lib/query-helpers';
import { canUploadEvidence, canModifyClientData } from '@/lib/permissions';
import { uploadEvidence, isAzureStorageConfigured } from '@/lib/azure-storage';
import { uploadEvidenceLocal } from '@/lib/evidence-local';
import { RegulationType } from '@/lib/regulations';

export async function POST(request: NextRequest) {
  try {
    if (isLocalStorage()) {
      await connectDBLocal();
    } else {
      await connectDB();
    }

    const ctx = await getAuthUserContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uploadPerm = canUploadEvidence(ctx);
    if (!uploadPerm.allowed) {
      return NextResponse.json({ error: uploadPerm.reason }, { status: 403 });
    }

    const formData = await request.formData();

    const file = formData.get('file') as File;
    const controlId = formData.get('controlId') as string;
    const requirementId = formData.get('requirementId') as string;
    const remediationActionId = formData.get('remediationActionId') as string;
    const evidenceType = formData.get('evidenceType') as string;
    const description = formData.get('description') as string;
    const complianceStatus = formData.get('complianceStatus') as string;
    const article = (formData.get('article') as string) || undefined;
    const clientId = (formData.get('clientId') as string) || undefined;
    const cabinetId = (formData.get('cabinetId') as string) || undefined;
    const regulationType =
      (formData.get('regulationType') as string) || RegulationType.CHILEAN_PRIVACY;

    if (!file || (!controlId && !requirementId && !article)) {
      return NextResponse.json(
        { error: 'File and either controlId, requirementId, or article are required' },
        { status: 400 }
      );
    }

    const filterParams = extractFilterParams(request);
    const stamp = resolveTenantStamp(ctx, { clientId, cabinetId }, filterParams);
    if (!stamp.clientId) {
      return NextResponse.json(
        { error: 'clientId is required — select a client before uploading evidence' },
        { status: 400 }
      );
    }

    const access = canModifyClientData(ctx, stamp.clientId);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Organize blob path: cabinet/client/article/...
    const meta = {
      userId: ctx.userId,
      controlId: controlId || '',
      requirementId: requirementId || '',
      evidenceType: evidenceType || 'OTHER',
      complianceStatus: complianceStatus || '',
      cabinetId: stamp.cabinetId || '',
      clientId: stamp.clientId || '',
      article: article || '',
    };

    let blobName: string;
    let url: string;
    try {
      if (isAzureStorageConfigured()) {
        ({ blobName, url } = await uploadEvidence(buffer, file.name, file.type, meta));
      } else {
        ({ blobName, url } = await uploadEvidenceLocal(buffer, file.name, file.type, meta));
      }
    } catch (uploadErr: any) {
      // Fallback to local disk if Azure fails in demo
      console.warn('Azure upload failed, using local evidence store:', uploadErr.message);
      ({ blobName, url } = await uploadEvidenceLocal(buffer, file.name, file.type, meta));
    }

    const evidencePayload = {
      evidenceId: `EVID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: ctx.userId,
      cabinetId: stamp.cabinetId,
      clientId: stamp.clientId,
      article,
      regulationType,
      controlId: controlId || undefined,
      requirementId: requirementId || undefined,
      remediationActionId: remediationActionId || undefined,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      blobName,
      evidenceType: evidenceType || 'OTHER',
      description,
      complianceStatus: complianceStatus || undefined,
      uploadedAt: new Date(),
    };

    let evidence: any;
    if (typeof (Evidence as any).create === 'function') {
      evidence = await Evidence.create(evidencePayload);
    } else {
      evidence = new Evidence(evidencePayload);
      await evidence.save();
    }

    return NextResponse.json({
      evidence,
      url,
      message: 'Evidence uploaded successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
