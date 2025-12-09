import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import QuestionMapping from '@/models/QuestionMapping';
import { getActiveRuleVersion } from '@/lib/services/precomputed-mappings';
import { getAuthUserContext } from '@/lib/auth-helper';
import { canAccessRuleEngine, canEditRuleEngine } from '@/lib/permissions';

// GET: list mappings for current rule version
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check permissions
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionCheck = canAccessRuleEngine(userContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || 'Access denied',
        requiresPermission: 'canAccessRuleEngine'
      }, { status: 403 });
    }

    const ruleVersion = await getActiveRuleVersion();
    // Support both mongoose and LocalModel (no .lean() in LocalModel)
    const raw = await QuestionMapping.find({ ruleVersion });
    const mappings = Array.isArray(raw) ? raw : [];
    return NextResponse.json({ ruleVersion, mappings });
  } catch (error: any) {
    console.error('Error fetching mappings:', error);
    // Fallback to avoid breaking UI; return empty set with warning
    return NextResponse.json({ ruleVersion: 'unknown', mappings: [], warning: error.message });
  }
}

// PUT: update controlBasedRequirements for a question mapping
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check permissions
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For PUT (edit), check canEditRuleEngine permission
    const permissionCheck = canEditRuleEngine(userContext);
    if (!permissionCheck.allowed) {
      // Fallback to canAccessRuleEngine for view-only
      const viewCheck = canAccessRuleEngine(userContext);
      if (!viewCheck.allowed) {
        return NextResponse.json({ 
          error: permissionCheck.reason || 'Access denied',
          requiresPermission: 'canEditRuleEngine'
        }, { status: 403 });
      }
      // If user can view but not edit, return read-only error
      return NextResponse.json({ 
        error: 'User can view but not edit rule engine mappings',
        requiresPermission: 'canEditRuleEngine'
      }, { status: 403 });
    }

    const body = await request.json();
    const { questionId, controlBasedRequirements, ruleVersion } = body;

    if (!questionId || !controlBasedRequirements) {
      return NextResponse.json({ error: 'questionId and controlBasedRequirements are required' }, { status: 400 });
    }

    const version = ruleVersion || await getActiveRuleVersion();

    const updated = await QuestionMapping.findOneAndUpdate(
      { questionId, ruleVersion: version },
      { controlBasedRequirements, computedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    return NextResponse.json({ ruleVersion: version, mapping: updated });
  } catch (error: any) {
    console.error('Error updating mapping:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

