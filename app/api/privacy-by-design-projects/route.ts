/**
 * Privacy by Design Projects API
 * Manages projects with privacy considerations and DPIA requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import PrivacyByDesignProject from '@/models/PrivacyByDesignProject';
import { RegulationType } from '@/lib/regulations';

// Generate unique project ID
function generateProjectId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'PBD-CHILE' : 'PBD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Determine if DPIA is required based on project characteristics
function isDPIARequired(project: any): boolean {
  // GDPR Article 35 criteria:
  // - Systematic and extensive evaluation of personal aspects
  // - Large-scale processing of special categories
  // - Systematic monitoring of publicly accessible areas
  // - High risk to rights and freedoms
  
  if (project.dataCategories?.some((cat: string) => 
    ['HEALTH', 'BIOMETRIC', 'CRIMINAL', 'SENSITIVE'].includes(cat)
  )) {
    return true;
  }
  
  if (project.internationalTransfers && !project.transferSafeguards?.length) {
    return true;
  }
  
  if (project.projectType === 'NEW_SYSTEM' || project.projectType === 'THIRD_PARTY_INTEGRATION') {
    return true;
  }
  
  return false;
}

// Calculate initial risk level
function calculateRiskLevel(project: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  let riskScore = 0;
  
  // High risk factors
  if (project.dataCategories?.some((cat: string) => 
    ['HEALTH', 'BIOMETRIC', 'CRIMINAL'].includes(cat)
  )) riskScore += 4;
  
  if (project.internationalTransfers && !project.transferSafeguards?.length) riskScore += 3;
  if (project.projectType === 'THIRD_PARTY_INTEGRATION') riskScore += 2;
  if (project.dataSubjectCategories?.includes('CHILDREN')) riskScore += 3;
  
  // Medium risk factors
  if (project.dataCategories?.includes('FINANCIAL')) riskScore += 2;
  if (project.projectType === 'NEW_SYSTEM') riskScore += 1;
  
  if (riskScore >= 6) return 'CRITICAL';
  if (riskScore >= 4) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const { searchParams } = new URL(request.url);
    const regulationType = searchParams.get('regulation') || RegulationType.CHILEAN_PRIVACY;
    const status = searchParams.get('status');
    const dpiaRequired = searchParams.get('dpiaRequired');
    const riskLevel = searchParams.get('riskLevel');

    const query: any = { regulationType };
    if (status) query.status = status;
    if (dpiaRequired) query.dpiaRequired = dpiaRequired === 'true';
    if (riskLevel) query.riskLevel = riskLevel;

    const projects = await PrivacyByDesignProject.find(query);
    // Sort manually by createdAt (newest first) since LocalStorage doesn't support Mongoose-style sort
    if (Array.isArray(projects)) {
      projects.sort((a: any, b: any) => {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate; // Descending order (newest first)
      });
    }
    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Error fetching privacy by design projects:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const {
      projectName,
      description,
      projectType,
      startDate,
      expectedCompletionDate,
      projectOwner,
      projectManager,
      businessUnit,
      dataCategories,
      dataSubjectCategories,
      processingPurposes,
      legalBasis,
      retentionPeriod,
      internationalTransfers,
      transferDetails,
      regulationType = RegulationType.CHILEAN_PRIVACY,
    } = body;

    if (!projectName || !description || !projectType || !startDate || !projectOwner || !businessUnit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const projectId = generateProjectId(regulationType);
    
    // Determine if DPIA is required
    const dpiaRequired = isDPIARequired({
      dataCategories,
      internationalTransfers,
      projectType,
    });
    
    // Calculate initial risk level
    const riskLevel = calculateRiskLevel({
      dataCategories,
      internationalTransfers,
      projectType,
      dataSubjectCategories,
    });

    const newProject = await PrivacyByDesignProject.create({
      projectId,
      projectName,
      description,
      projectType,
      status: dpiaRequired ? 'DPIA_REQUIRED' : 'PLANNING',
      startDate: new Date(startDate),
      expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
      projectOwner,
      projectManager,
      businessUnit,
      dpiaRequired,
      dpiaStatus: dpiaRequired ? 'NOT_STARTED' : undefined,
      riskLevel,
      dataCategories: dataCategories || [],
      dataSubjectCategories: dataSubjectCategories || [],
      processingPurposes: processingPurposes || [],
      legalBasis: legalBasis || [],
      retentionPeriod,
      internationalTransfers: internationalTransfers || false,
      transferDetails,
      privacyControls: [],
      committeeDecisions: [],
      complianceStatus: 'PENDING',
      regulationType,
    });

    return NextResponse.json({ project: newProject }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating privacy by design project:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const body = await request.json();
    const { projectId, ...updateData } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    // Handle date conversions
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.expectedCompletionDate) updateData.expectedCompletionDate = new Date(updateData.expectedCompletionDate);
    if (updateData.actualCompletionDate) updateData.actualCompletionDate = new Date(updateData.actualCompletionDate);

    const updatedProject = await PrivacyByDesignProject.findOneAndUpdate(
      { projectId },
      updateData,
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project: updatedProject });
  } catch (error: any) {
    console.error('Error updating privacy by design project:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
