import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import { getAuthUser } from '@/lib/auth-helper';
import User from '@/models/User';
import { RegulationType } from '@/lib/regulations';

export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOne({ _id: auth.userId } as any);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const u = user as any;
    return NextResponse.json({
      id: u._id,
      email: u.email,
      name: u.name,
      company: u.company,
      preferredRegulation: u.preferredRegulation ?? RegulationType.DORA,
      enabledRegulations: Array.isArray(u.enabledRegulations) && u.enabledRegulations.length > 0
        ? u.enabledRegulations
        : [RegulationType.DORA, RegulationType.CHILEAN_PRIVACY],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDBLocal();
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferredRegulation, enabledRegulations } = body;

    const update: Record<string, any> = {};
    if (preferredRegulation !== undefined && Object.values(RegulationType).includes(preferredRegulation)) {
      update.preferredRegulation = preferredRegulation;
    }
    if (Array.isArray(enabledRegulations)) {
      const valid = enabledRegulations.filter((r: string) =>
        (Object.values(RegulationType) as string[]).includes(r)
      ) as RegulationType[];
      if (valid.length > 0) update.enabledRegulations = valid;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatePayload = isLocalStorage() ? update : { $set: update };
    const user = await User.findOneAndUpdate(
      { _id: auth.userId } as any,
      updatePayload as any,
      { new: true }
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const u = user as any;
    return NextResponse.json({
      id: u._id,
      email: u.email,
      name: u.name,
      company: u.company,
      preferredRegulation: u.preferredRegulation ?? RegulationType.DORA,
      enabledRegulations: u.enabledRegulations ?? [RegulationType.DORA, RegulationType.CHILEAN_PRIVACY],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
