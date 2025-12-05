import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DORARequirement from '@/models/DORARequirement';
import Control from '@/models/Control';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// GET - Get ISO 27001 suggestions for a requirement or control
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    verifyToken(token);
    
    const searchParams = request.nextUrl.searchParams;
    const requirementId = searchParams.get('requirementId');
    const controlId = searchParams.get('controlId');
    const pillar = searchParams.get('pillar');
    
    // Load ISO 27001 mappings
    const mappingsPath = path.join(process.cwd(), 'data', 'iso27001-mappings.json');
    let isoMappings: any = {};
    
    if (fs.existsSync(mappingsPath)) {
      isoMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    }
    
    let suggestions = [];
    
    if (requirementId) {
      const requirement = await DORARequirement.findOne({ requirementId });
      if (requirement) {
        // Return existing mappings or generate from pillar
        if (requirement.iso27001Mappings && requirement.iso27001Mappings.length > 0) {
          suggestions = requirement.iso27001Mappings;
        } else {
          const pillarMappings = isoMappings.mappings?.[requirement.pillar]?.controls || [];
          suggestions = pillarMappings;
        }
      }
    } else if (controlId) {
      const control = await Control.findOne({ controlId });
      if (control) {
        if (control.iso27001Mappings && control.iso27001Mappings.length > 0) {
          suggestions = control.iso27001Mappings;
        } else {
          const pillarMappings = isoMappings.mappings?.[control.pillar]?.controls || [];
          suggestions = pillarMappings;
        }
      }
    } else if (pillar) {
      const pillarMappings = isoMappings.mappings?.[pillar]?.controls || [];
      suggestions = pillarMappings;
    } else {
      return NextResponse.json(
        { error: 'requirementId, controlId, or pillar parameter is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

