import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Control from '@/models/Control';
import DORARequirement from '@/models/DORARequirement';

// GET controls associated with a requirement
export async function GET(
  request: NextRequest,
  { params }: { params: { requirementId: string } }
) {
  try {
    await connectDBLocal();
    
    const { requirementId } = params;
    
    // Find the requirement
    const requirement = await DORARequirement.findOne({
      $or: [
        { requirementId },
        { _id: requirementId },
      ],
    });
    
    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }
    
    const reqId = String(requirement._id || requirement.requirementId);
    const reqRequirementId = requirement.requirementId;
    
    // Find controls that reference this requirement
    // Check both _id and requirementId in the requirementIds array
    const allControls = await Control.find({});
    const controls = allControls.filter((control: any) => {
      if (!control.requirementIds || !Array.isArray(control.requirementIds)) {
        return false;
      }
      return control.requirementIds.some((id: any) => {
        const idStr = String(id);
        return idStr === reqId || idStr === reqRequirementId;
      });
    });
    
    // Format controls for response
    const formattedControls = controls.map((control: any) => ({
      _id: control._id,
      controlId: control.controlId,
      title: control.title,
      description: control.description,
      pillar: control.pillar,
      controlType: control.controlType,
      complianceStatus: control.complianceStatus,
    }));
    
    return NextResponse.json({
      controls: formattedControls,
    });
  } catch (error: any) {
    console.error('Error fetching requirement controls:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

