import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Affiliate from '@/models/Affiliate';
import Organization from '@/models/Organization';
import { getAuthUserContext } from '@/lib/auth-helper';
import { UserRole } from '@/models/Organization';
import { canAccessAffiliate } from '@/lib/permissions';

/**
 * GET /api/affiliates
 * Get affiliates based on user role
 */
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SuperAdmin sees all affiliates in their organization (or all if no org filter)
    if (userContext.role === UserRole.SUPER_ADMIN) {
      const searchParams = request.nextUrl.searchParams;
      const orgFilter = searchParams.get('organizationId');
      
      if (orgFilter && orgFilter !== 'all') {
        const affiliates = await Affiliate.find({ organizationId: orgFilter });
        return NextResponse.json({ affiliates });
      } else if (userContext.organizationId) {
        const affiliates = await Affiliate.find({ organizationId: userContext.organizationId });
        return NextResponse.json({ affiliates });
      } else {
        // SuperAdmin without org filter sees all affiliates
        const affiliates = await Affiliate.find({});
        return NextResponse.json({ affiliates });
      }
    }

    // Admin and User see only their affiliate
    if (userContext.affiliateId) {
      const affiliate = await Affiliate.findById(userContext.affiliateId);
      if (affiliate) {
        return NextResponse.json({ affiliates: [affiliate] });
      }
    }

    return NextResponse.json({ affiliates: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/affiliates
 * Create a new affiliate (SuperAdmin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SuperAdmin can create affiliates
    if (userContext.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden: Only SuperAdmin can create affiliates' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Use the user's organizationId automatically
    const organizationId = userContext.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'User must be associated with an organization' }, { status: 400 });
    }

    // Verify organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Generate affiliateId automatically
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const affiliateId = `AFF-${timestamp}-${randomId}`;

    // Use create() for LocalModel compatibility
    const affiliate = await Affiliate.create({
      affiliateId,
      name,
      description,
      organizationId,
    });

    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

