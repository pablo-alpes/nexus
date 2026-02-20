import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import RemediationPlan from '@/models/RemediationPlan';
import GapAnalysis from '@/models/GapAnalysis';
import Control, { getControlModel } from '@/models/Control';
import Asset from '@/models/Asset';
import { getAuthUser } from '@/lib/auth-helper';
import { RegulationType, getRegulationConfig } from '@/lib/regulations';
import { DORAPillar } from '@/models/DORARequirement';
import { ensureControlsSetup } from '@/lib/auto-controls';
import { generateAIStrategy } from '@/lib/services/ai-strategy';

function getPillarsForRegulation(regulationType: RegulationType | string | null) {
  if (!regulationType || regulationType === RegulationType.DORA) {
    return ['ICT_RISK_MANAGEMENT', 'INCIDENT_MANAGEMENT', 'RESILIENCE_TESTING', 'THIRD_PARTY_RISK', 'INFORMATION_SHARING'];
  }
  const config = getRegulationConfig(regulationType as RegulationType);
  return config.pillars.map(p => p.id);
}

// Evidence suggestions based on control type and pillar
const EVIDENCE_SUGGESTIONS: { [key: string]: string[] } = {
  // DORA Pillars
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
  // Chilean Privacy Pillars
  LAWFULNESS_FAIRNESS: [
    'Legal Basis Documentation',
    'Consent Records',
    'Contract Documentation',
    'Legal Obligation Records',
    'Legitimate Interest Assessments',
    'Privacy Impact Assessments',
  ],
  PURPOSE_LIMITATION: [
    'Data Collection Purpose Documentation',
    'Privacy Policy',
    'Data Processing Agreements',
    'Purpose Limitation Policies',
    'Data Usage Logs',
    'Purpose Change Documentation',
  ],
  DATA_MINIMIZATION: [
    'Data Minimization Policy',
    'Data Collection Forms',
    'Data Retention Policies',
    'Data Inventory',
    'Data Minimization Assessments',
    'Collection Justification Records',
  ],
  PROPORTIONALITY: [
    'Proportionality Assessments',
    'Data Processing Justifications',
    'Impact Assessments',
    'Risk-Benefit Analysis',
    'Processing Documentation',
    'Proportionality Review Records',
  ],
  QUALITY: [
    'Data Quality Policy',
    'Data Accuracy Procedures',
    'Data Update Records',
    'Data Validation Procedures',
    'Quality Control Reports',
    'Data Correction Logs',
  ],
  ACCOUNTABILITY: [
    'Accountability Framework',
    'Compliance Documentation',
    'Responsibility Assignments',
    'Compliance Monitoring Reports',
    'Training Records',
    'Internal Audit Reports',
  ],
  SECURITY: [
    'Security Policy',
    'Technical Security Measures Documentation',
    'Organizational Security Measures',
    'Security Incident Reports',
    'Access Control Documentation',
    'Encryption Documentation',
  ],
  TRANSPARENCY_CONFIDENTIALITY: [
    'Privacy Notices',
    'Transparency Reports',
    'Data Subject Communication Records',
    'Confidentiality Agreements',
    'Disclosure Documentation',
    'Transparency Policy',
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
    const regulation = searchParams.get('regulation') || RegulationType.DORA;
    const regulationPillars = getPillarsForRegulation(regulation);
    
    const query: any = { 
      userId: String(user.userId),
      regulationType: regulation,
    };
    if (pillar) {
      if (regulationPillars.includes(pillar)) {
        query.pillar = pillar;
      } else {
        return NextResponse.json({ remediationPlans: [] });
      }
    } else {
      query.pillar = { $in: regulationPillars };
    }
    
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
    const { pillar, regulation } = body;
    const regulationType = regulation || RegulationType.DORA;
    const regulationPillars = getPillarsForRegulation(regulationType);
    
    if (!pillar) {
      return NextResponse.json(
        { error: 'Pillar is required' },
        { status: 400 }
      );
    }
    
    // Validate pillar belongs to regulation
    if (!regulationPillars.includes(pillar)) {
      return NextResponse.json(
        { error: `Pillar ${pillar} is not valid for regulation ${regulationType}` },
        { status: 400 }
      );
    }
    
    // Get gap analysis for this pillar
    const gapAnalysis = await GapAnalysis.findOne({
      userId: String(user.userId),
      pillar,
      regulationType: regulationType,
    });
    
    if (!gapAnalysis) {
      return NextResponse.json(
        { error: 'Gap analysis not found. Please run gap analysis first.' },
        { status: 404 }
      );
    }
    
    // Get user's assets
    const assets = await Asset.find({ userId: String(user.userId) });
    
    // Get all controls for this pillar (regulation-scoped in local storage)
    const controlQuery: any = { pillar };
    const ControlModel = isLocalStorage() ? getControlModel(regulationType) : Control;
    const allControls = await ControlModel.find(controlQuery);
    const controlsMap = new Map();
    allControls.forEach((c: any) => {
      // Map by both _id and controlId for compatibility
      const id1 = String(c._id || '');
      const id2 = String(c.controlId || '');
      if (id1) controlsMap.set(id1, c);
      if (id2) controlsMap.set(id2, c);
    });
    
    console.log(`📋 Remediation: Found ${allControls.length} controls for pillar ${pillar}`);
    console.log(`📋 Remediation: Gap analysis has ${gapAnalysis.gaps?.length || 0} gaps`);
    
    // Create remediation actions from gaps
    const actions = [];
    
    for (const gap of gapAnalysis.gaps || []) {
      if (gap.status === 'FULLY_IMPLEMENTED' || gap.status === 'NOT_APPLICABLE') {
        continue; // Skip implemented or not applicable gaps
      }
      
      // Try to find control by gap.controlId (could be _id or controlId format)
      const controlIdStr = String(gap.controlId || '');
      let control = controlsMap.get(controlIdStr);
      
      // If not found, try to find by matching controlId field
      if (!control && controlIdStr) {
        control = allControls.find((c: any) => 
          String(c._id) === controlIdStr || 
          String(c.controlId) === controlIdStr
        );
      }
      
      if (!control) {
        console.warn(`⚠️  Remediation: Control not found for gap with controlId: ${controlIdStr}`);
        continue;
      }
      
      // Find applicable assets for this control
      const applicableAssets = assets.filter((asset: any) => {
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
        applicableAssets: applicableAssets.map((a: any) => ({
          assetId: a.assetId,
          name: a.name,
          criticalityLevel: a.criticalityLevel,
          assetType: a.assetType, // Include asset type for cost estimation
        })),
        evidenceSuggestions: evidenceSuggestions,
        controlTitle: control.title,
        controlDescription: control.description,
        controlType: control.controlType, // Include control type for cost estimation
      };
      
      actions.push(action);
    }
    
    console.log(`📋 Remediation: Created ${actions.length} actions from ${gapAnalysis.gaps?.length || 0} gaps`);
    
    // If no actions were created but there are gaps, log warning
    if (actions.length === 0 && gapAnalysis.gaps && gapAnalysis.gaps.length > 0) {
      const notImplementedGaps = gapAnalysis.gaps.filter((g: any) => 
        g.status !== 'FULLY_IMPLEMENTED' && g.status !== 'NOT_APPLICABLE'
      );
      console.warn(`⚠️  Remediation: No actions created despite ${notImplementedGaps.length} gaps with status NOT_IMPLEMENTED or PARTIALLY_IMPLEMENTED`);
      console.warn(`   This might indicate missing controls or ID mismatches`);
    }
    
    // Create remediation plan
    const remediationPlan = await RemediationPlan.findOneAndUpdate(
      { 
        userId: String(user.userId), 
        pillar,
        regulationType: regulationType,
      },
      {
        userId: String(user.userId),
        regulationType: regulationType,
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

    // Calculate KPIs for strategy generation
    // Use simplified calculation based on gap analysis
    const CRITICALITY_MULTIPLIERS: Record<number, number> = {
      1: 10000,
      2: 50000,
      3: 200000,
      4: 1000000,
    };
    const GAP_SEVERITY_MULTIPLIERS: Record<string, number> = {
      'CRITICAL': 1.0,
      'HIGH': 0.7,
      'MEDIUM': 0.4,
      'LOW': 0.1,
    };

    let estimatedMaxLoss = 0;
    gapAnalysis.gaps?.forEach((gap: any) => {
      if (gap.status === 'NOT_IMPLEMENTED' || gap.status === 'PARTIALLY_IMPLEMENTED') {
        const severityMultiplier = GAP_SEVERITY_MULTIPLIERS[gap.priority] || 0.1;
        const maxAssetCriticality = assets.length > 0
          ? Math.max(...assets.map((a: any) => a.criticalityLevel || 1))
          : 1;
        const baseLoss = CRITICALITY_MULTIPLIERS[maxAssetCriticality] || CRITICALITY_MULTIPLIERS[1];
        estimatedMaxLoss += baseLoss * severityMultiplier;
      }
    });

    const formatCurrency = (amount: number) => {
      if (amount >= 1000000) {
        return `€${(amount / 1000000).toFixed(2)}M`;
      } else if (amount >= 1000) {
        return `€${(amount / 1000).toFixed(0)}K`;
      }
      return `€${amount.toFixed(0)}`;
    };

    const kpis = {
      estimatedMaxLoss: Math.round(estimatedMaxLoss),
      estimatedMaxLossFormatted: formatCurrency(estimatedMaxLoss),
      overallCompliance: gapAnalysis.compliancePercentage || 0,
    };

    // Generate AI-powered strategic recommendations
    let strategy = null;
    try {
      strategy = await generateAIStrategy(
        actions,
        gapAnalysis,
        assets,
        kpis,
        pillar
      );
    } catch (error) {
      console.error('Error generating AI strategy:', error);
      // Continue without strategy if generation fails
    }
    
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
      strategy, // AI-generated strategic recommendations
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
    const { pillar, actionIndex, updates, regulation } = body;
    const regulationType = regulation || RegulationType.DORA;
    
    if (!pillar || actionIndex === undefined) {
      return NextResponse.json(
        { error: 'Pillar and actionIndex are required' },
        { status: 400 }
      );
    }
    
    const remediationPlan = await RemediationPlan.findOne({
      userId: String(user.userId),
      pillar,
      regulationType: regulationType,
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
        { 
          userId: String(user.userId), 
          pillar,
          regulationType: regulationType,
        },
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
