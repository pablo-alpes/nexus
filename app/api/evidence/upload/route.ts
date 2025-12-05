import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Evidence from '@/models/Evidence';
import { verifyToken } from '@/lib/auth';
import { uploadEvidence } from '@/lib/azure-storage';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = verifyToken(token);
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const controlId = formData.get('controlId') as string;
    const requirementId = formData.get('requirementId') as string;
    const remediationActionId = formData.get('remediationActionId') as string;
    const evidenceType = formData.get('evidenceType') as string;
    const description = formData.get('description') as string;
    const complianceStatus = formData.get('complianceStatus') as string;
    
    if (!file || (!controlId && !requirementId)) {
      return NextResponse.json(
        { error: 'File and either controlId or requirementId are required' },
        { status: 400 }
      );
    }
    
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }
    
    // Validate file type
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
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Azure Blob Storage
    const { blobName, url } = await uploadEvidence(
      buffer,
      file.name,
      file.type,
      {
        userId: payload.userId,
        controlId: controlId || '',
        requirementId: requirementId || '',
        evidenceType: evidenceType || 'OTHER',
        complianceStatus: complianceStatus || '',
      }
    );
    
    // Save evidence record
    const evidence = new Evidence({
      evidenceId: `EVID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: payload.userId,
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
    });
    
    await evidence.save();
    
    return NextResponse.json({
      evidence,
      message: 'Evidence uploaded successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

