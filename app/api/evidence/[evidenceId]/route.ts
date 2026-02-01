import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Evidence from '@/models/Evidence';
import { verifyToken } from '@/lib/auth';
import { downloadEvidence, deleteEvidence } from '@/lib/azure-storage';

// GET evidence file
export async function GET(
  request: NextRequest,
  { params }: { params: { evidenceId: string } }
) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = verifyToken(token);
    const evidence = await Evidence.findOne({
      evidenceId: params.evidenceId,
      userId: payload.userId,
    });
    
    if (!evidence) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }
    
    // Download from Azure Blob Storage
    const fileBuffer = await downloadEvidence(evidence.blobName);
    
    // NextResponse accepts Buffer, Uint8Array, or ArrayBuffer
    // Buffer extends Uint8Array, so we can use it directly with type assertion
    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': evidence.mimeType,
        'Content-Disposition': `attachment; filename="${evidence.fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE evidence
export async function DELETE(
  request: NextRequest,
  { params }: { params: { evidenceId: string } }
) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = verifyToken(token);
    const evidence = await Evidence.findOne({
      evidenceId: params.evidenceId,
      userId: payload.userId,
    });
    
    if (!evidence) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }
    
    // Delete from Azure Blob Storage
    await deleteEvidence(evidence.blobName);
    
    // Delete from database
    await Evidence.deleteOne({ _id: evidence._id });
    
    return NextResponse.json({ message: 'Evidence deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
