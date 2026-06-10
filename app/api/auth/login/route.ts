import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import User from '@/models/User';
import { comparePassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const isValidPassword = await comparePassword(password, (user as any).password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
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

