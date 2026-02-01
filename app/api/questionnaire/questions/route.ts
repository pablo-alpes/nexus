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
    const regulation = searchParams.get('regulation');
    
    const query: any = {};
    if (pillar) query.pillar = pillar;
    
    // Get all questions - simple approach
    let allQuestions = await Question.find(query);
    
    // Filter by regulation if specified
    if (regulation === 'CHILEAN_PRIVACY') {
      // Chilean Privacy questions: check regulationType field, questionId prefix, or pillars
      const chileanPrivacyPillars = [
        'LAWFULNESS_FAIRNESS',
        'PURPOSE_LIMITATION',
        'DATA_MINIMIZATION',
        'PROPORTIONALITY',
        'QUALITY',
        'ACCOUNTABILITY',
        'SECURITY',
        'TRANSPARENCY_CONFIDENTIALITY',
      ];
      allQuestions = allQuestions.filter((q: any) => 
        q.regulationType === 'CHILEAN_PRIVACY' ||
        q.questionId?.startsWith('Q-PRIV-') || 
        chileanPrivacyPillars.includes(q.pillar || '')
      );
    } else if (regulation === 'DORA') {
      // DORA questions - exclude Chilean Privacy
      allQuestions = allQuestions.filter((q: any) => 
        q.regulationType !== 'CHILEAN_PRIVACY' &&
        !q.questionId?.startsWith('Q-PRIV-')
      );
    }
    
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

// PUT - Update question
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    const { _id, questionId, ...updateData } = body;
    
    const query = _id ? { _id } : { questionId };
    const question = await Question.findOneAndUpdate(
      query,
      updateData,
      { new: true }
    );
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ question });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete question
export async function DELETE(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const questionId = searchParams.get('questionId');
    
    const query = id ? { _id: id } : questionId ? { questionId } : null;
    
    if (!query) {
      return NextResponse.json(
        { error: 'ID or questionId required' },
        { status: 400 }
      );
    }
    
    const result = await Question.deleteOne(query);
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
