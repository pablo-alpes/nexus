import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DORARequirement from '@/models/DORARequirement';
import { getAuthUser } from '@/lib/auth-helper';
import fs from 'fs';
import path from 'path';

// POST - Import requirements from JSON file
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal(); // Use local storage if MongoDB not available
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { requirements } = body;
    
    if (!requirements || !Array.isArray(requirements)) {
      return NextResponse.json(
        { error: 'Invalid format. Expected array of requirements.' },
        { status: 400 }
      );
    }
    
    const imported: string[] = [];
    const errors: { requirementId: string; error: string }[] = [];
    
    for (const req of requirements) {
      try {
        const requirement = await DORARequirement.findOneAndUpdate(
          { requirementId: req.requirementId },
          {
            requirementId: req.requirementId,
            chapter: req.chapter,
            article: req.article,
            paragraph: req.paragraph,
            title: req.title,
            description: req.description,
            legalText: req.legalText || req.description,
            pillar: req.pillar,
            complianceStatus: req.complianceStatus || 'NOT_APPLICABLE',
            notes: req.notes,
            iso27001Mappings: req.iso27001Mappings || [],
          },
          { upsert: true, new: true }
        );
        
        imported.push(requirement.requirementId);
      } catch (error: any) {
        errors.push({ requirementId: req.requirementId, error: error.message });
      }
    }
    
    return NextResponse.json({
      message: `Imported ${imported.length} requirements`,
      imported: imported.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET - Load from local JSON file (for initial setup)
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal(); // Use local storage if MongoDB not available
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Try to load from data directory
    const jsonPath = path.join(process.cwd(), 'data', 'dora-requirements-final.json');
    
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json(
        { error: 'JSON file not found. Please upload requirements manually.' },
        { status: 404 }
      );
    }
    
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(fileContent);
    
    // Import requirements
    const imported: string[] = [];
    const errors: { requirementId: string; error: string }[] = [];
    
    for (const req of data.requirements) {
      try {
        const requirement = await DORARequirement.findOneAndUpdate(
          { requirementId: req.requirementId },
          {
            requirementId: req.requirementId,
            chapter: req.chapter,
            article: req.article,
            paragraph: req.paragraph,
            title: req.title,
            description: req.description,
            legalText: req.legalText || req.description,
            pillar: req.pillar,
            complianceStatus: req.complianceStatus || 'NOT_APPLICABLE',
            notes: req.notes,
            iso27001Mappings: req.iso27001Mappings || [],
          },
          { upsert: true, new: true }
        );
        
        imported.push(requirement.requirementId);
      } catch (error: any) {
        errors.push({ requirementId: req.requirementId, error: error.message });
      }
    }
    
    return NextResponse.json({
      message: `Imported ${imported.length} requirements from JSON file`,
      imported: imported.length,
      errors: errors.length,
      errorDetails: errors,
      metadata: data.metadata,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

