import { NextResponse } from 'next/server';
import { ensureRequirementsImported } from '@/lib/auto-import';
import { ensureMockDataSetup } from '@/lib/auto-setup';
import { ensureQuestionnaireSetup } from '@/lib/auto-questionnaire';
import { ensureControlsSetup } from '@/lib/auto-controls';
import { ensureMockQuestionnaireResponse } from '@/lib/auto-questionnaire-response';

export async function GET() {
  // Trigger auto-import and mock data setup on health check (runs once)
  try {
    await ensureRequirementsImported();
    await ensureMockDataSetup();
    await ensureQuestionnaireSetup();
    await ensureControlsSetup();
    await ensureMockQuestionnaireResponse();
  } catch (error) {
    // Don't fail health check if setup fails
    console.error('Auto-setup on health check failed:', error);
  }
  
  return NextResponse.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
}
