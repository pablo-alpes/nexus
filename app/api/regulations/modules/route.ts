import { NextResponse } from 'next/server';
import { getRegulationModules } from '@/lib/regulations';

export async function GET() {
  const modules = getRegulationModules();
  return NextResponse.json({ modules });
}
