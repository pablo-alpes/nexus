import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Question from '@/models/Question';
import { ensureQuestionnaireSetup } from '@/lib/auto-questionnaire';

// GET all questions (ordered)
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Auto-create questionnaire if none exists
    await ensureQuestionnaireSetup();
    
    const searchParams = request.nextUrl.searchParams;
    const pillar = searchParams.get('pillar');
    
    const query: any = {};
    if (pillar) query.pillar = pillar;
    
    // Get all questions - simple approach
    let allQuestions = await Question.find(query);
    
    console.log(`📋 Found ${allQuestions.length} questions in database`);
    
    if (allQuestions.length === 0) {
      console.warn('⚠️  No questions found in database');
      return NextResponse.json({ questions: [] });
    }
    
    // Simple deduplication: keep first occurrence of each questionId
    const seenQuestionIds = new Set<string>();
    const uniqueQuestions: any[] = [];
    
    // Sort by order first to keep the first one
    allQuestions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    
    for (const question of allQuestions) {
      const questionId = question.questionId || String(question._id);
      
      // Simple check: if we've seen this questionId, skip it
      if (!seenQuestionIds.has(questionId)) {
        seenQuestionIds.add(questionId);
        uniqueQuestions.push(question);
      }
    }
    
    console.log(`✅ Returning ${uniqueQuestions.length} unique questions (filtered from ${allQuestions.length} total)`);
    
    // Return questions sorted by order
    uniqueQuestions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    
    return NextResponse.json({ questions: uniqueQuestions });
  } catch (error: any) {
    console.error('❌ Error loading questions:', error.message);
    console.error(error.stack);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create question
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    
    const question = new Question({
      ...body,
      questionId: body.questionId || `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
    
    await question.save();
    
    return NextResponse.json({ question });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
