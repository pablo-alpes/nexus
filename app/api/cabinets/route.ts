import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Cabinet, { UserRole } from '@/models/Cabinet';
import { getAuthUserContext } from '@/lib/auth-helper';

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const ctx = await getAuthUserContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let cabinets: any[] = [];
    if (ctx.role === UserRole.PLATFORM_ADMIN) {
      cabinets = await Cabinet.find({});
    } else if (ctx.cabinetId) {
      const cabinet = await Cabinet.findById(ctx.cabinetId);
      cabinets = cabinet ? [cabinet] : [];
    }

    return NextResponse.json({ cabinets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    const ctx = await getAuthUserContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.role !== UserRole.PLATFORM_ADMIN) {
      return NextResponse.json({ error: 'Only platform admins can create cabinets' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const slug =
      body.slug ||
      String(body.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const cabinet = await Cabinet.create({
      name: body.name,
      description: body.description,
      slug,
    });

    return NextResponse.json({ cabinet }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
