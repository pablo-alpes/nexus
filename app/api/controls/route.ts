import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Control from '@/models/Control';
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
    
    const query: any = {};
    if (pillar) query.pillar = pillar;
    if (controlType) query.controlType = controlType;
    
    // Local storage doesn't support populate, so we fetch directly
    const controls = await Control.find(query, { controlId: 1 });
    
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

