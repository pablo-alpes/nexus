import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import RemediationPlan from '@/models/RemediationPlan';
import GapAnalysis from '@/models/GapAnalysis';
import Control from '@/models/Control';
import Asset from '@/models/Asset';
import { getAuthUser } from '@/lib/auth-helper';
import { DORAPillar } from '@/models/DORARequirement';
import { ensureControlsSetup } from '@/lib/auto-controls';

// Evidence suggestions based on control type and pillar
const EVIDENCE_SUGGESTIONS: { [key: string]: string[] } = {
  ICT_RISK_MANAGEMENT: [
    'ICT Risk Management Framework Document',
    'Risk Assessment Reports',
    'Risk Register',
    'Risk Treatment Plans',
    'Management Review Minutes',
    'Risk Monitoring Reports',
  ],
  INCIDENT_MANAGEMENT: [
    'Incident Management Policy',
    'Incident Response Procedures',
    'Incident Log/Register',
    'Incident Reports',
    'Post-Incident Review Reports',
    'Communication Templates',
  ],
  RESILIENCE_TESTING: [
    'Testing Schedule',
    'Test Results and Reports',
    'Penetration Test Reports',
    'Vulnerability Assessment Reports',
    'Business Continuity Test Results',
    'Disaster Recovery Test Results',
  ],
  THIRD_PARTY_RISK: [
    'Third-Party Risk Assessment Reports',
    'Vendor Contracts with Security Clauses',
    'Due Diligence Documentation',
    'Third-Party Monitoring Reports',
    'Exit Strategy Documents',
    'Service Level Agreements (SLAs)',
  ],
  INFORMATION_SHARING: [
    'Information Sharing Agreements',
    'Participation Certificates',
    'Threat Intelligence Reports',
    'Sharing Arrangement Documentation',
    'Notification to Authorities',
  ],
};

// GET remediation plans for user
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const pillar = searchParams.get('pillar') as DORAPillar;
    
    const query: any = { userId: String(user.userId) };
    if (pillar) query.pillar = pillar;
    
    const remediationPlans = await RemediationPlan.find(query, { createdAt: -1 });
    
    return NextResponse.json({ remediationPlans });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Generate remediation plan from gap analysis
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Ensure controls are created
    await ensureControlsSetup();
    
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { pillar } = body;
    
    if (!pillar) {
      return NextResponse.json(
        { error: 'Pillar is required' },
        { status: 400 }
      );
    }
    
    // Get gap analysis for this pillar
    const gapAnalysis = await GapAnalysis.findOne({
      userId: String(user.userId),
      pillar,
    });
    
    if (!gapAnalysis) {
      return NextResponse.json(
        { error: 'Gap analysis not found. Please run gap analysis first.' },
        { status: 404 }
      );
    }
    
    // Get user's assets
    const assets = await Asset.find({ userId: String(user.userId) });
    
    // Get all controls
    const allControls = await Control.find({ pillar });
    const controlsMap = new Map();
    allControls.forEach(c => {
      controlsMap.set(String(c._id || c.controlId), c);
    });
    
    // Create remediation actions from gaps
    const actions = [];
    
    for (const gap of gapAnalysis.gaps || []) {
      if (gap.status === 'FULLY_IMPLEMENTED' || gap.status === 'NOT_APPLICABLE') {
        continue; // Skip implemented or not applicable gaps
      }
      
      const control = controlsMap.get(String(gap.controlId));
      if (!control) continue;
      
      // Find applicable assets for this control
      const applicableAssets = assets.filter(asset => {
        if (control.controlType === 'TRANSVERSAL') {
          if (control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return true;
        } else if (control.controlType === 'SPECIFIC') {
          const matchesType = control.applicableAssetTypes?.includes(asset.assetType) || false;
          if (matchesType && control.minCriticalityLevel) {
            return asset.criticalityLevel >= control.minCriticalityLevel;
          }
          return matchesType;
        }
        return false;
      });
      
      // Get evidence suggestions for this pillar
      const evidenceSuggestions = EVIDENCE_SUGGESTIONS[pillar] || [
        'Policy Document',
        'Procedure Document',
        'Implementation Evidence',
        'Monitoring Reports',
      ];
      
      // Create remediation action
      const action = {
        controlId: String(gap.controlId),
        action: `Implement ${control.title || 'Control'}`,
        description: gap.gapDescription || `Implement control ${control.controlId} for applicable assets`,
        priority: gap.priority || 'MEDIUM',
        status: 'NOT_STARTED',
        dueDate: null,
        assignedTo: null,
        evidenceIds: [],
        applicableAssets: applicableAssets.map(a => ({
          assetId: a.assetId,
          name: a.name,
          criticalityLevel: a.criticalityLevel,
        })),
        evidenceSuggestions: evidenceSuggestions,
        controlTitle: control.title,
        controlDescription: control.description,
      };
      
      actions.push(action);
    }
    
    // Create remediation plan
    const remediationPlan = await RemediationPlan.findOneAndUpdate(
      { userId: String(user.userId), pillar },
      {
        userId: String(user.userId),
        pillar,
        actions,
        startDate: new Date().toISOString(),
        targetCompletionDate: null,
      },
      { upsert: true, new: true }
    );
    
    // Format as table for frontend
    const tableData = actions.map((action, index) => {
      // Truncate asset names to avoid long text
      const assetText = action.applicableAssets.map((a: any) => `${a.name} (Level ${a.criticalityLevel})`).join(', ');
      const truncatedAssetText = assetText.length > 50 ? `${assetText.substring(0, 50)}...` : assetText;
      
      return {
        id: `RMD-${String(index + 1).padStart(4, '0')}`,
        pillar: pillar,
        controlId: action.controlId,
        controlTitle: action.controlTitle || action.action,
        controlNeeded: action.action,
        applicableAssets: truncatedAssetText,
        applicableAssetsFull: assetText, // Keep full text for tooltip
        assetCount: action.applicableAssets.length,
        status: action.status,
        priority: action.priority,
        evidenceSubmission: action.evidenceIds.length > 0 ? 'Submitted' : 'Pending',
        evidenceCount: action.evidenceIds.length,
        evidenceSuggestions: action.evidenceSuggestions,
        comment: action.description,
        dueDate: action.dueDate,
        assignedTo: action.assignedTo,
        gapDescription: action.description,
      };
    });
    
    return NextResponse.json({
      remediationPlan,
      tableData,
      summary: {
        totalActions: actions.length,
        notStarted: actions.filter(a => a.status === 'NOT_STARTED').length,
        inProgress: actions.filter(a => a.status === 'IN_PROGRESS').length,
        completed: actions.filter(a => a.status === 'COMPLETED').length,
        critical: actions.filter(a => a.priority === 'CRITICAL').length,
        high: actions.filter(a => a.priority === 'HIGH').length,
      },
    });
  } catch (error: any) {
    console.error('Remediation plan error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

// PUT - Update remediation action
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { pillar, actionIndex, updates } = body;
    
    if (!pillar || actionIndex === undefined) {
      return NextResponse.json(
        { error: 'Pillar and actionIndex are required' },
        { status: 400 }
      );
    }
    
    const remediationPlan = await RemediationPlan.findOne({
      userId: String(user.userId),
      pillar,
    });
    
    if (!remediationPlan) {
      return NextResponse.json(
        { error: 'Remediation plan not found' },
        { status: 404 }
      );
    }
    
    // Update specific action
    if (remediationPlan.actions && remediationPlan.actions[actionIndex]) {
      remediationPlan.actions[actionIndex] = {
        ...remediationPlan.actions[actionIndex],
        ...updates,
      };
      
      await RemediationPlan.findOneAndUpdate(
        { userId: String(user.userId), pillar },
        { actions: remediationPlan.actions },
        { new: true }
      );
    }
    
    return NextResponse.json({ remediationPlan });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
