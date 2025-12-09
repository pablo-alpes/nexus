import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Organization from '@/models/Organization';
import { getAuthUserContext } from '@/lib/auth-helper';
import { UserRole } from '@/models/Organization';

/**
 * GET /api/organizations
 * Get all organizations (SuperAdmin only) or user's organization
 */
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SuperAdmin can see all organizations
    if (userContext.role === UserRole.SUPER_ADMIN) {
      const organizations = await Organization.find({});
      return NextResponse.json({ organizations });
    }

    // Other users see only their organization
    if (userContext.organizationId) {
      const organization = await Organization.findById(userContext.organizationId);
      if (organization) {
        return NextResponse.json({ organizations: [organization] });
      }
    }

    return NextResponse.json({ organizations: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/organizations
 * Create a new organization (SuperAdmin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SuperAdmin can create organizations
    if (userContext.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Forbidden: Only SuperAdmin can create organizations' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Use create() for LocalModel compatibility
    const organization = await Organization.create({
      name,
      description,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

