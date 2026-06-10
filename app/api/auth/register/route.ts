import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import User from '@/models/User';
import { hashPassword, generateToken } from '@/lib/auth';
import { RegulationType } from '@/lib/regulations';

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    const { email, password, name, company } = body;
    
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
    
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: (name as string).trim(),
      company: company?.trim(),
      preferredRegulation: RegulationType.DORA,
      enabledRegulations: [RegulationType.DORA, RegulationType.CHILEAN_PRIVACY],
    });
    
    const userId = (user as any)._id?.toString?.() ?? String((user as any)._id);
    const token = generateToken({
      userId,
      email: (user as any).email,
    });
    
    return NextResponse.json({
      token,
      user: {
        id: (user as any)._id,
        email: (user as any).email,
        name: (user as any).name,
        company: (user as any).company,
        preferredRegulation: (user as any).preferredRegulation,
        enabledRegulations: (user as any).enabledRegulations,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

