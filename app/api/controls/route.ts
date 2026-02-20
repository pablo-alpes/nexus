import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import Control, { getControlModel } from '@/models/Control';
import DORARequirement from '@/models/DORARequirement';
import { getAuthUser } from '@/lib/auth-helper';
import { ensureControlsSetup } from '@/lib/auto-controls';
import { RegulationType, getRegulationConfig } from '@/lib/regulations';

// Get pillars dynamically based on regulation type
function getPillarsForRegulation(regulationType: RegulationType | string | null) {
  if (!regulationType || regulationType === RegulationType.DORA) {
    return [
      'ICT_RISK_MANAGEMENT',
      'INCIDENT_MANAGEMENT',
      'RESILIENCE_TESTING',
      'THIRD_PARTY_RISK',
      'INFORMATION_SHARING',
    ];
  }
  const config = getRegulationConfig(regulationType as RegulationType);
  return config.pillars.map(p => p.id);
}

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
    const regulation = searchParams.get('regulation') || RegulationType.DORA;
    
    // Get pillars for this regulation
    const regulationPillars = getPillarsForRegulation(regulation);
    
    const query: any = {};
    if (pillar) {
      query.pillar = pillar;
      // Verify pillar belongs to this regulation
      if (!regulationPillars.includes(pillar)) {
        return NextResponse.json({ controls: [] });
      }
    } else {
      // Filter by regulation pillars if no specific pillar requested
      query.pillar = { $in: regulationPillars };
    }
    if (controlType) query.controlType = controlType;
    
    // Use regulation-scoped model for local storage (separate file per regulation)
    const ControlModel = isLocalStorage() ? getControlModel(regulation) : Control;
    const controls = await ControlModel.find(query, { controlId: 1 });
    
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

// POST - Create or update control (regulation from query for storage scope)
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const regulation = body.regulation || request.nextUrl.searchParams.get('regulation') || RegulationType.DORA;
    const ControlModel = isLocalStorage() ? getControlModel(regulation) : Control;
    
    const control = await ControlModel.findOneAndUpdate(
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

// PUT - Update control (regulation from query for storage scope)
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    const { controlId, regulation, ...updateData } = body;
    const reg = regulation || request.nextUrl.searchParams.get('regulation') || RegulationType.DORA;
    const ControlModel = isLocalStorage() ? getControlModel(reg) : Control;
    
    if (!controlId) {
      return NextResponse.json(
        { error: 'controlId is required' },
        { status: 400 }
      );
    }
    
    const control = await ControlModel.findOneAndUpdate(
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

