import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import { getAuthUserContext } from '@/lib/auth-helper';
import { UserRole } from '@/models/Organization';
import { createMockAssetsForUser } from '@/lib/auto-setup';
import User from '@/models/User';

/**
 * POST /api/assets/mock
 * Create mock assets for a specific user (SuperAdmin only)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const userContext = await getAuthUserContext(request);
    
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SuperAdmin can create mock assets for users
    if (userContext.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ 
        error: 'Forbidden: Only SuperAdmin can create mock assets' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required' 
      }, { status: 400 });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Create mock assets for the user
    const result = await createMockAssetsForUser(userId);

    return NextResponse.json({ 
      message: `Created ${result.created} mock assets for user ${user.email}`,
      created: result.created,
      errors: result.errors,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating mock assets:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

