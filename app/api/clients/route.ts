import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Client from '@/models/Client';
import { UserRole } from '@/models/Cabinet';
import { getAuthUserContext } from '@/lib/auth-helper';
import { canManageClients } from '@/lib/permissions';

function generateClientId(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 12);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CLI-${slug}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const ctx = await getAuthUserContext(request);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const cabinetFilter = searchParams.get('cabinetId');

    let query: Record<string, any> = {};

    if (ctx.role === UserRole.PLATFORM_ADMIN) {
      if (cabinetFilter) query.cabinetId = String(cabinetFilter);
    } else if (ctx.role === UserRole.CABINET_ADMIN || ctx.role === UserRole.CABINET_LAWYER) {
      if (!ctx.cabinetId) {
        return NextResponse.json({ clients: [] });
      }
      query.cabinetId = String(ctx.cabinetId);
    } else {
      // CLIENT_USER — only their client
      if (!ctx.clientId) {
        return NextResponse.json({ clients: [] });
      }
      query.clientId = String(ctx.clientId);
    }

    const clients = await Client.find(query);
    return NextResponse.json({ clients });
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

    const manage = canManageClients(ctx);
    if (!manage.allowed) {
      return NextResponse.json({ error: manage.reason }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const cabinetId =
      ctx.role === UserRole.PLATFORM_ADMIN
        ? body.cabinetId || ctx.cabinetId
        : ctx.cabinetId;

    if (!cabinetId) {
      return NextResponse.json({ error: 'cabinetId is required' }, { status: 400 });
    }

    const client = await Client.create({
      clientId: body.clientId || generateClientId(body.name),
      name: body.name,
      description: body.description,
      industry: body.industry,
      cabinetId: String(cabinetId),
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
