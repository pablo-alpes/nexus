import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Control from '@/models/Control';

// DELETE - Delete control
export async function DELETE(
  request: NextRequest,
  { params }: { params: { controlId: string } }
) {
  try {
    await connectDBLocal();
    
    const { controlId } = params;
    
    const result = await Control.deleteOne({ controlId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Control not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Control deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update control
export async function PUT(
  request: NextRequest,
  { params }: { params: { controlId: string } }
) {
  try {
    await connectDBLocal();
    
    const { controlId } = params;
    const body = await request.json();
    
    const control = await Control.findOneAndUpdate(
      { controlId },
      body,
      { new: true }
    );
    
    if (!control) {
      return NextResponse.json(
        { error: 'Control not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ control });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

