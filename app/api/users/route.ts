import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import User from '@/models/User';
import { getAuthUserContext } from '@/lib/auth-helper';
import { UserRole } from '@/models/Organization';
import { isOrganizationAdmin, canAccessAffiliate } from '@/lib/permissions';

/**
 * GET /api/users
 * Get users based on role and permissions
 */
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const affiliateId = searchParams.get('affiliateId');
    const organizationId = searchParams.get('organizationId');

    let query: any = {};

    // SuperAdmin can see all users in their organization
    if (userContext.role === UserRole.SUPER_ADMIN) {
      if (organizationId && organizationId !== 'all') {
        query.organizationId = organizationId;
      } else if (userContext.organizationId) {
        query.organizationId = userContext.organizationId;
      }
    } 
    // Organization Admin can see users in their organization
    else if (isOrganizationAdmin(userContext).allowed) {
      if (userContext.organizationId) {
        query.organizationId = userContext.organizationId;
      }
    }
    // Admin can see users in their affiliate
    else if (userContext.role === UserRole.ADMIN) {
      if (userContext.affiliateId) {
        query.affiliateId = userContext.affiliateId;
      }
    }
    // Regular users can only see themselves
    else {
      query._id = userContext.userId;
    }

    // Additional filters
    if (affiliateId && affiliateId !== 'all') {
      query.affiliateId = affiliateId;
    }

    const users = await User.find(query);
    
    // Remove password from response
    const sanitizedUsers = users.map((u: any) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      company: u.company,
      role: u.role,
      organizationId: u.organizationId,
      affiliateId: u.affiliateId,
      permissions: u.permissions,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Create a new user (SuperAdmin and Organization Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SuperAdmin and Organization Admin can create users
    if (userContext.role !== UserRole.SUPER_ADMIN && !isOrganizationAdmin(userContext).allowed) {
      return NextResponse.json({ error: 'Only SuperAdmin and Organization Admin can create users' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, company, role, permissions, affiliateId, organizationId } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Validate role assignment
    const targetRole = role || UserRole.USER;
    if (targetRole === UserRole.SUPER_ADMIN && userContext.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Only SuperAdmin can create SuperAdmin users' }, { status: 403 });
    }

    // Set organizationId based on creator's context
    let finalOrganizationId = organizationId;
    if (!finalOrganizationId && userContext.organizationId) {
      finalOrganizationId = userContext.organizationId;
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name,
      company,
      role: targetRole,
      organizationId: finalOrganizationId || undefined,
      affiliateId: affiliateId || undefined,
      permissions: permissions || {},
    });

    // Remove password from response
    const sanitizedUser = {
      _id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      company: newUser.company,
      role: newUser.role,
      organizationId: newUser.organizationId,
      affiliateId: newUser.affiliateId,
      permissions: newUser.permissions,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return NextResponse.json({ user: sanitizedUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/users
 * Update user (role, permissions, affiliate, organization)
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, role, permissions, affiliateId, organizationId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Find the user to update
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    // SuperAdmin can update anyone in their organization
    if (userContext.role === UserRole.SUPER_ADMIN) {
      if (targetUser.organizationId && userContext.organizationId !== targetUser.organizationId?.toString()) {
        return NextResponse.json({ error: 'Cannot update user from different organization' }, { status: 403 });
      }
    }
    // Organization Admin can update users in their organization
    else if (isOrganizationAdmin(userContext).allowed) {
      if (userContext.organizationId !== targetUser.organizationId?.toString()) {
        return NextResponse.json({ error: 'Cannot update user from different organization' }, { status: 403 });
      }
      // Org Admin cannot change role to SUPER_ADMIN
      if (role === UserRole.SUPER_ADMIN) {
        return NextResponse.json({ error: 'Organization Admin cannot create SuperAdmins' }, { status: 403 });
      }
    }
    // Admin can update users in their affiliate
    else if (userContext.role === UserRole.ADMIN) {
      if (userContext.affiliateId !== targetUser.affiliateId?.toString()) {
        return NextResponse.json({ error: 'Cannot update user from different affiliate' }, { status: 403 });
      }
      // Admin cannot change role or assign to different affiliate
      if (role && role !== targetUser.role) {
        return NextResponse.json({ error: 'Admin cannot change user roles' }, { status: 403 });
      }
      if (affiliateId && affiliateId !== targetUser.affiliateId?.toString()) {
        return NextResponse.json({ error: 'Admin cannot reassign users to different affiliates' }, { status: 403 });
      }
    }
    // Regular users can only update themselves (and only certain fields)
    else {
      if (userId !== userContext.userId) {
        return NextResponse.json({ error: 'Cannot update other users' }, { status: 403 });
      }
      // Users can only update their own name and company, not role/permissions
      const updateData: any = {};
      if (body.name) updateData.name = body.name;
      if (body.company !== undefined) updateData.company = body.company;
      
      const updated = await User.findOneAndUpdate(
        { _id: userId },
        updateData,
        { new: true }
      );

      return NextResponse.json({ user: updated });
    }

    // Build update data
    const updateData: any = {};
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = { ...targetUser.permissions, ...permissions };
    if (affiliateId !== undefined) updateData.affiliateId = affiliateId || null;
    if (organizationId !== undefined) updateData.organizationId = organizationId || null;
    if (body.name) updateData.name = body.name;
    if (body.company !== undefined) updateData.company = body.company;

    const updated = await User.findOneAndUpdate(
      { _id: userId },
      updateData,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Remove password from response
    const sanitizedUser = {
      _id: updated._id,
      email: updated.email,
      name: updated.name,
      company: updated.company,
      role: updated.role,
      organizationId: updated.organizationId,
      affiliateId: updated.affiliateId,
      permissions: updated.permissions,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return NextResponse.json({ user: sanitizedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/users
 * Delete a user
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Cannot delete yourself
    if (userId === userContext.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    // Only SuperAdmin and Organization Admin can delete users
    if (userContext.role !== UserRole.SUPER_ADMIN && !isOrganizationAdmin(userContext).allowed) {
      return NextResponse.json({ error: 'Only SuperAdmin and Organization Admin can delete users' }, { status: 403 });
    }

    // SuperAdmin can delete anyone in their organization
    if (userContext.role === UserRole.SUPER_ADMIN) {
      if (targetUser.organizationId && userContext.organizationId !== targetUser.organizationId?.toString()) {
        return NextResponse.json({ error: 'Cannot delete user from different organization' }, { status: 403 });
      }
    }
    // Organization Admin can delete users in their organization (but not SuperAdmins)
    else if (isOrganizationAdmin(userContext).allowed) {
      if (userContext.organizationId !== targetUser.organizationId?.toString()) {
        return NextResponse.json({ error: 'Cannot delete user from different organization' }, { status: 403 });
      }
      if (targetUser.role === UserRole.SUPER_ADMIN) {
        return NextResponse.json({ error: 'Cannot delete SuperAdmin' }, { status: 403 });
      }
    }

    await User.deleteOne({ _id: userId });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

