import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Control from '@/models/Control';
import { getAuthUserContext } from '@/lib/auth-helper';
import { canEditRuleEngine } from '@/lib/permissions';
import DORARequirement from '@/models/DORARequirement';
import { getAuthUser } from '@/lib/auth-helper';
import { ensureControlsSetup } from '@/lib/auto-controls';

// GET all controls (filtered by questionnaire responses)
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Ensure controls are created
    await ensureControlsSetup();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const pillar = searchParams.get('pillar');
    const controlType = searchParams.get('controlType');
    const includeCounts = searchParams.get('includeCounts') === 'true';
    
    const query: any = {};
    if (pillar) query.pillar = pillar;
    if (controlType) query.controlType = controlType;
    
    // Local storage doesn't support populate, so we fetch directly
    const controls = await Control.find(query, { controlId: 1 });
    
    // If includeCounts is true, add requirement counts for each control
    if (includeCounts) {
      const controlsWithCounts = await Promise.all(
        controls.map(async (control: any) => {
          const requirementIds = control.requirementIds || [];
          const requirementCount = requirementIds.length;
          
          return {
            ...control.toObject ? control.toObject() : control,
            associatedRequirementsCount: requirementCount,
          };
        })
      );
      
      return NextResponse.json({ controls: controlsWithCounts });
    }
    
    return NextResponse.json({ controls });
  } catch (error: any) {
    console.error('Error fetching controls:', error);
    return NextResponse.json(
      { error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

// POST - Create or update control
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    const control = await Control.findOneAndUpdate(
      { controlId: body.controlId },
      body,
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ control });
  } catch (error: any) {
    console.error('Error creating/updating control:', error);
    return NextResponse.json(
      { error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

// PUT - Update control
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionCheck = canEditRuleEngine(userContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || 'Access denied',
        requiresPermission: 'canEditRuleEngine'
      }, { status: 403 });
    }
    
    const body = await request.json();
    const { controlId, ...updateData } = body;
    
    if (!controlId) {
      return NextResponse.json(
        { error: 'controlId is required' },
        { status: 400 }
      );
    }
    
    const control = await Control.findOneAndUpdate(
      { controlId },
      updateData,
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

