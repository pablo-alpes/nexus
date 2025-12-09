import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import { getAuthUserContext } from '@/lib/auth-helper';
import User from '@/models/User';

/**
 * GET /api/auth/me
 * Get current user information
 */
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(userContext.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        organizationId: user.organizationId,
        affiliateId: user.affiliateId,
        permissions: user.permissions,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

