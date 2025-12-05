import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import DORARequirement from '@/models/DORARequirement';
import { ensureRequirementsImported } from '@/lib/auto-import';
import * as XLSX from 'xlsx';

// GET all requirements
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal(); // Use local storage if MongoDB not available
    
    // Auto-import requirements if database is empty
    await ensureRequirementsImported();
    
    const searchParams = request.nextUrl.searchParams;
    const pillar = searchParams.get('pillar');
    
    const query = pillar ? { pillar } : {};
    const requirements = await DORARequirement.find(query, { requirementId: 1 });
    
    return NextResponse.json({ requirements });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Import requirements from Excel
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal(); // Use local storage if MongoDB not available
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const requirements = [];
    for (const row of data as any[]) {
      const requirement = {
        requirementId: row.requirementId || row['Requirement ID'],
        title: row.title || row.Title,
        description: row.description || row.Description,
        pillar: row.pillar || row.Pillar,
        article: row.article || row.Article,
        paragraph: row.paragraph || row.Paragraph,
        legalText: row.legalText || row['Legal Text'],
        applicableTo: row.applicableTo ? row.applicableTo.split(',') : undefined,
      };
      
      requirements.push(requirement);
    }
    
    // Upsert requirements
    const operations = requirements.map(req => ({
      updateOne: {
        filter: { requirementId: req.requirementId },
        update: { $set: req },
        upsert: true,
      },
    }));
    
    await DORARequirement.bulkWrite(operations);
    
    return NextResponse.json({
      message: `Imported ${requirements.length} requirements`,
      count: requirements.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

