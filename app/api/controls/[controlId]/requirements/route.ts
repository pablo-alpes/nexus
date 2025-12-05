import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Control from '@/models/Control';
import DORARequirement from '@/models/DORARequirement';

// GET requirements associated with a control
export async function GET(
  request: NextRequest,
  { params }: { params: { controlId: string } }
) {
  try {
    await connectDBLocal();
    
    const { controlId } = params;
    
    // Find the control
    const control = await Control.findOne({
      $or: [
        { controlId },
        { _id: controlId },
      ],
    });
    
    if (!control) {
      return NextResponse.json(
        { error: 'Control not found' },
        { status: 404 }
      );
    }
    
    const requirementIds = control.requirementIds || [];
    
    // Find requirements that are referenced by this control
    // Convert requirementIds to strings for matching
    const requirementIdStrings = requirementIds.map((id: any) => String(id));
    
    // Get all requirements and filter
    const allRequirements = await DORARequirement.find({});
    const requirements = allRequirements.filter((req: any) => {
      const reqId = String(req._id || req.requirementId);
      const reqRequirementId = req.requirementId;
      return requirementIdStrings.some((id: string) => 
        id === reqId || id === reqRequirementId
      );
    });
    
    // Format requirements for response
    const formattedRequirements = requirements.map((req: any) => ({
      _id: req._id,
      requirementId: req.requirementId,
      title: req.title,
      description: req.description,
      pillar: req.pillar,
      complianceStatus: req.complianceStatus,
    }));
    
    return NextResponse.json({
      control: {
        controlId: control.controlId,
        title: control.title,
      },
      requirements: formattedRequirements,
      count: formattedRequirements.length,
    });
  } catch (error: any) {
    console.error('Error fetching control requirements:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

