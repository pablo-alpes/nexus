import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DORARequirement from '@/models/DORARequirement';

// DELETE - Delete requirement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { requirementId: string } }
) {
  try {
    await connectDBLocal();
    
    const { requirementId } = params;
    
    const result = await DORARequirement.deleteOne({ requirementId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Requirement deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

