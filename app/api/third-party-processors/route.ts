/**
 * Third Party Processors API
 * Manages third-party data processors (GDPR Article 28)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import ThirdPartyProcessor from '@/models/ThirdPartyProcessor';
import { RegulationType } from '@/lib/regulations';

// Generate unique processor ID
function generateProcessorId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'TPP-CHILE' : 'TPP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Calculate risk level based on processor characteristics
function calculateRiskLevel(processor: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  let riskScore = 0;
  
  // High risk factors
  if (!processor.dpaSigned) riskScore += 3;
  if (processor.transfersToThirdCountries && !processor.sccSigned) riskScore += 4;
  if (processor.processorType === 'CLOUD_PROVIDER' || processor.processorType === 'DATA_ANALYTICS') riskScore += 2;
  if (processor.complianceStatus === 'NON_COMPLIANT') riskScore += 5;
  if (!processor.breachNotificationCapability) riskScore += 2;
  if (processor.certifications.length === 0) riskScore += 2;
  
  // Medium risk factors
  if (!processor.contractSigned) riskScore += 2;
  if (processor.subProcessors && processor.subProcessors.length > 0 && !processor.subProcessorDisclosure) riskScore += 2;
  
  if (riskScore >= 8) return 'CRITICAL';
  if (riskScore >= 5) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const { searchParams } = new URL(request.url);
    const regulationType = searchParams.get('regulation') || RegulationType.CHILEAN_PRIVACY;
    const status = searchParams.get('status');
    const complianceStatus = searchParams.get('complianceStatus');
    const riskLevel = searchParams.get('riskLevel');

    const query: any = { regulationType };
    if (status) query.status = status;
    if (complianceStatus) query.complianceStatus = complianceStatus;
    if (riskLevel) query.riskLevel = riskLevel;

    const processors = await ThirdPartyProcessor.find(query);
    
    // Sort by risk level (critical first) then by name
    processors.sort((a, b) => {
      const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const aRisk = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 4;
      const bRisk = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 4;
      if (aRisk !== bRisk) return aRisk - bRisk;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ processors });
  } catch (error: any) {
    console.error('Error fetching third party processors:', error);
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
      name,
      companyName,
      contactEmail,
      contactPhone,
      address,
      country,
      processorType,
      servicesProvided,
      dataCategoriesProcessed,
      processingPurposes,
      dataSubjectCategories,
      contractSigned,
      contractDate,
      contractExpiryDate,
      dpaSigned,
      dpaDate,
      sccSigned,
      sccDate,
      certifications,
      securityMeasures,
      breachNotificationCapability,
      subProcessorDisclosure,
      subProcessors,
      transfersToThirdCountries,
      thirdCountries,
      transferSafeguards,
      relatedProcessingActivities,
      assignedOwner,
      notes,
      regulationType = RegulationType.CHILEAN_PRIVACY,
    } = body;

    if (!name || !companyName || !contactEmail || !country || !processorType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, companyName, contactEmail, country, processorType' },
        { status: 400 }
      );
    }

    const processorId = generateProcessorId(regulationType);

    // Calculate initial risk level
    const initialRiskLevel = calculateRiskLevel({
      dpaSigned,
      transfersToThirdCountries,
      sccSigned,
      processorType,
      complianceStatus: 'PENDING_ASSESSMENT',
      breachNotificationCapability,
      certifications: certifications || [],
      contractSigned,
      subProcessorDisclosure,
      subProcessors,
    });

    const newProcessor = await ThirdPartyProcessor.create({
      processorId,
      name,
      companyName,
      contactEmail,
      contactPhone,
      address,
      country,
      processorType,
      servicesProvided: Array.isArray(servicesProvided) ? servicesProvided : [servicesProvided],
      dataCategoriesProcessed: Array.isArray(dataCategoriesProcessed) ? dataCategoriesProcessed : [dataCategoriesProcessed],
      processingPurposes: Array.isArray(processingPurposes) ? processingPurposes : [processingPurposes],
      dataSubjectCategories: Array.isArray(dataSubjectCategories) ? dataSubjectCategories : [dataSubjectCategories],
      contractSigned: contractSigned || false,
      contractDate: contractDate ? new Date(contractDate) : undefined,
      contractExpiryDate: contractExpiryDate ? new Date(contractExpiryDate) : undefined,
      dpaSigned: dpaSigned || false,
      dpaDate: dpaDate ? new Date(dpaDate) : undefined,
      sccSigned: sccSigned || false,
      sccDate: sccDate ? new Date(sccDate) : undefined,
      certifications: certifications || [],
      complianceStatus: 'PENDING_ASSESSMENT',
      riskLevel: initialRiskLevel,
      securityMeasures: securityMeasures || [],
      breachNotificationCapability: breachNotificationCapability || false,
      subProcessorDisclosure: subProcessorDisclosure || false,
      subProcessors: subProcessors || [],
      transfersToThirdCountries: transfersToThirdCountries || false,
      thirdCountries: thirdCountries || [],
      transferSafeguards: transferSafeguards || [],
      relatedProcessingActivities: relatedProcessingActivities || [],
      status: 'ACTIVE',
      assignedOwner,
      notes,
      regulationType,
    });

    return NextResponse.json({ processor: newProcessor }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating third party processor:', error);
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
    const { processorId, ...updateData } = body;

    if (!processorId) {
      return NextResponse.json(
        { error: 'Missing processorId' },
        { status: 400 }
      );
    }

    // Recalculate risk level if relevant fields changed
    if (updateData.dpaSigned !== undefined || updateData.sccSigned !== undefined || 
        updateData.complianceStatus !== undefined || updateData.certifications !== undefined) {
      const existing = await ThirdPartyProcessor.findOne({ processorId });
      if (existing) {
        const updated = { ...existing.toObject(), ...updateData };
        updateData.riskLevel = calculateRiskLevel(updated);
      }
    }

    const updatedProcessor = await ThirdPartyProcessor.findOneAndUpdate(
      { processorId },
      updateData,
      { new: true }
    );

    if (!updatedProcessor) {
      return NextResponse.json(
        { error: 'Processor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ processor: updatedProcessor });
  } catch (error: any) {
    console.error('Error updating third party processor:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
