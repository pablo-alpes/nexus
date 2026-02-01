/**
 * Breach Notification API
 * Manages data breach notifications to authorities and data subjects
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import BreachNotification from '@/models/BreachNotification';
import { RegulationType } from '@/lib/regulations';

// Generate unique breach ID
function generateBreachId(regulationType: string): string {
  const prefix = regulationType === RegulationType.CHILEAN_PRIVACY ? 'BREACH-CHILE' : 'BREACH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Calculate if authority notification is required (72 hours in Chile)
function isAuthorityNotificationRequired(severity: string, affectedSubjects: number): boolean {
  // In Chile, notification is required if:
  // - High or Critical severity, OR
  // - More than 100 affected data subjects
  return severity === 'HIGH' || severity === 'CRITICAL' || affectedSubjects > 100;
}

// Calculate if subject notification is required
function isSubjectNotificationRequired(severity: string, breachType: string): boolean {
  // Always notify subjects for high/critical breaches or confidentiality breaches
  return severity === 'HIGH' || severity === 'CRITICAL' || breachType === 'CONFIDENTIALITY' || breachType === 'COMBINED';
}

// Initialize workflow stages (GDPR Best Practice)
function initializeWorkflowStages(breachDate: Date, authorityRequired: boolean, subjectRequired: boolean): any[] {
  const now = new Date();
  const breach = new Date(breachDate);
  const deadline72h = new Date(breach);
  deadline72h.setHours(deadline72h.getHours() + 72);

  const stages = [
    {
      stage: 'DETECTION',
      status: 'COMPLETED',
      completedDate: now,
      dueDate: now,
    },
    {
      stage: 'ASSESSMENT',
      status: 'IN_PROGRESS',
      assignedDate: now,
      dueDate: new Date(breach.getTime() + 2 * 60 * 60 * 1000), // 2 hours
    },
    {
      stage: 'CONTAINMENT',
      status: 'PENDING',
      dueDate: new Date(breach.getTime() + 4 * 60 * 60 * 1000), // 4 hours
    },
    {
      stage: 'INVESTIGATION',
      status: 'PENDING',
      dueDate: new Date(breach.getTime() + 24 * 60 * 60 * 1000), // 24 hours
    },
  ];

  if (authorityRequired) {
    stages.push({
      stage: 'NOTIFICATION_PREP',
      status: 'PENDING',
      dueDate: new Date(deadline72h.getTime() - 12 * 60 * 60 * 1000), // 12 hours before deadline
    });
    stages.push({
      stage: 'AUTHORITY_NOTIFICATION',
      status: 'PENDING',
      dueDate: deadline72h,
    });
  }

  if (subjectRequired) {
    stages.push({
      stage: 'SUBJECT_NOTIFICATION',
      status: 'PENDING',
      dueDate: new Date(deadline72h.getTime() + 24 * 60 * 60 * 1000), // 24 hours after authority
    });
  }

  stages.push({
    stage: 'REMEDIATION',
    status: 'PENDING',
    dueDate: new Date(breach.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  stages.push({
    stage: 'CLOSURE',
    status: 'PENDING',
    dueDate: new Date(breach.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return stages;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const { searchParams } = new URL(request.url);
    const regulationType = searchParams.get('regulation') || RegulationType.CHILEAN_PRIVACY;
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    const query: any = { regulationType };
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const breaches = await BreachNotification.find(query);
    
    // Sort by breach date (newest first)
    breaches.sort((a, b) => {
      const aDate = new Date(a.breachDate).getTime();
      const bDate = new Date(b.breachDate).getTime();
      return bDate - aDate;
    });

    return NextResponse.json({ breaches });
  } catch (error: any) {
    console.error('Error fetching breach notifications:', error);
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
      incidentTitle,
      incidentDescription,
      breachDate,
      discoveryDate,
      breachType,
      breachCategory,
      affectedDataCategories,
      affectedDataSubjects,
      severity,
      relatedProcessingActivity,
      relatedControls,
      relatedProcessor,
      assignedTo,
      processOwner,
      regulationType = RegulationType.CHILEAN_PRIVACY,
      containmentMeasures,
      remediationActions,
    } = body;

    if (!incidentTitle || !incidentDescription || !breachDate || !breachType || !breachCategory || !affectedDataCategories || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const breachId = generateBreachId(regulationType);
    const authorityNotificationRequired = isAuthorityNotificationRequired(severity, affectedDataSubjects || 0);
    const subjectNotificationRequired = isSubjectNotificationRequired(severity, breachType);
    const breachDateObj = new Date(breachDate);
    
    // Initialize workflow stages
    const workflowStages = initializeWorkflowStages(
      breachDateObj,
      authorityNotificationRequired,
      subjectNotificationRequired
    );

    const newBreach = await BreachNotification.create({
      breachId,
      incidentTitle,
      incidentDescription,
      breachDate: breachDateObj,
      discoveryDate: discoveryDate ? new Date(discoveryDate) : new Date(),
      breachType,
      breachCategory,
      affectedDataCategories: Array.isArray(affectedDataCategories) ? affectedDataCategories : [affectedDataCategories],
      affectedDataSubjects: affectedDataSubjects || 0,
      severity,
      status: 'DETECTED',
      authorityNotificationRequired,
      subjectNotificationRequired,
      workflowStages,
      currentStage: 'ASSESSMENT',
      relatedProcessingActivity,
      relatedControls: relatedControls || [],
      relatedProcessor,
      assignedTo,
      processOwner: processOwner || assignedTo,
      regulationType,
      containmentMeasures: containmentMeasures || [],
      remediationActions: remediationActions || [],
    });

    return NextResponse.json({ breach: newBreach }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating breach notification:', error);
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
    const { breachId, ...updateData } = body;

    if (!breachId) {
      return NextResponse.json(
        { error: 'Missing breachId' },
        { status: 400 }
      );
    }

    // Set notification dates when status changes
    if (updateData.status === 'NOTIFIED_AUTHORITY' && !updateData.authorityNotificationDate) {
      updateData.authorityNotificationDate = new Date();
      // Update workflow stage
      if (updateData.workflowStages) {
        const authStage = updateData.workflowStages.find((s: any) => s.stage === 'AUTHORITY_NOTIFICATION');
        if (authStage) {
          authStage.status = 'COMPLETED';
          authStage.completedDate = new Date();
        }
      }
    }
    if (updateData.status === 'NOTIFIED_SUBJECTS' && !updateData.subjectNotificationDate) {
      updateData.subjectNotificationDate = new Date();
      // Update workflow stage
      if (updateData.workflowStages) {
        const subjectStage = updateData.workflowStages.find((s: any) => s.stage === 'SUBJECT_NOTIFICATION');
        if (subjectStage) {
          subjectStage.status = 'COMPLETED';
          subjectStage.completedDate = new Date();
        }
      }
    }

    // Update workflow stage if provided
    if (updateData.workflowStageUpdate) {
      const { stage, status, owner, notes } = updateData.workflowStageUpdate;
      const existing = await BreachNotification.findOne({ breachId });
      if (existing && existing.workflowStages) {
        const stageIndex = existing.workflowStages.findIndex((s: any) => s.stage === stage);
        if (stageIndex !== -1) {
          const stageUpdate: any = { ...existing.workflowStages[stageIndex] };
          if (status) {
            stageUpdate.status = status;
            if (status === 'COMPLETED') {
              stageUpdate.completedDate = new Date();
            } else if (status === 'IN_PROGRESS' && !stageUpdate.assignedDate) {
              stageUpdate.assignedDate = new Date();
            }
          }
          if (owner) stageUpdate.owner = owner;
          if (notes) stageUpdate.notes = notes;
          
          existing.workflowStages[stageIndex] = stageUpdate;
          updateData.workflowStages = existing.workflowStages;
          
          // Update current stage if this one is completed
          if (status === 'COMPLETED') {
            const nextStage = existing.workflowStages.find((s: any, idx: number) => idx > stageIndex && s.status === 'PENDING');
            if (nextStage) {
              updateData.currentStage = nextStage.stage;
              nextStage.status = 'IN_PROGRESS';
              nextStage.assignedDate = new Date();
            }
          }
        }
      }
      delete updateData.workflowStageUpdate;
    }

    const updatedBreach = await BreachNotification.findOneAndUpdate(
      { breachId },
      updateData,
      { new: true }
    );

    if (!updatedBreach) {
      return NextResponse.json(
        { error: 'Breach not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ breach: updatedBreach });
  } catch (error: any) {
    console.error('Error updating breach notification:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
