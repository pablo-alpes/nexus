import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import Question, { getQuestionModel } from '@/models/Question';
import { ensureQuestionnaireSetup } from '@/lib/auto-questionnaire';
import { RegulationType } from '@/lib/regulations';

// GET all questions (ordered) - scoped by regulation for separate DORA vs Chilean Privacy data
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const searchParams = request.nextUrl.searchParams;
    const pillar = searchParams.get('pillar');
    const regulation = searchParams.get('regulation') || RegulationType.DORA;
    
    // Auto-create questionnaire if none exists (DORA only)
    if (regulation === RegulationType.DORA) {
      await ensureQuestionnaireSetup();
    }
    
    const query: any = {};
    if (pillar) query.pillar = pillar;
    
    // Use regulation-scoped model for local storage (separate file); filter by regulationType for MongoDB
    const QuestionModel = isLocalStorage() ? getQuestionModel(regulation) : Question;
    let allQuestions = await QuestionModel.find(query);
    
    // For MongoDB, filter by regulationType when present on documents
    if (!isLocalStorage()) {
      if (regulation === RegulationType.CHILEAN_PRIVACY) {
        const chileanPrivacyPillars = [
          'LAWFULNESS_FAIRNESS', 'PURPOSE_LIMITATION', 'DATA_MINIMIZATION', 'PROPORTIONALITY',
          'QUALITY', 'ACCOUNTABILITY', 'SECURITY', 'TRANSPARENCY_CONFIDENTIALITY',
        ];
        allQuestions = allQuestions.filter((q: any) =>
          q.regulationType === RegulationType.CHILEAN_PRIVACY ||
          q.questionId?.startsWith('Q-PRIV-') ||
          chileanPrivacyPillars.includes(q.pillar || '')
        );
      } else {
        allQuestions = allQuestions.filter((q: any) =>
          q.regulationType !== RegulationType.CHILEAN_PRIVACY && !q.questionId?.startsWith('Q-PRIV-')
        );
      }
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

// POST - Create question (regulation from body or query for correct storage scope)
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    const regulation = body.regulation || request.nextUrl.searchParams.get('regulation') || RegulationType.DORA;
    const QuestionModel = isLocalStorage() ? getQuestionModel(regulation) : Question;
    
    const question = await QuestionModel.create({
      ...body,
      questionId: body.questionId || `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...(body.regulationType ? {} : { regulationType: regulation }),
    });
    
    return NextResponse.json({ question });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update question (regulation from query for correct storage scope)
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const body = await request.json();
    const { _id, questionId, ...updateData } = body;
    const regulation = body.regulation || request.nextUrl.searchParams.get('regulation') || RegulationType.DORA;
    const QuestionModel = isLocalStorage() ? getQuestionModel(regulation) : Question;
    
    const query = _id ? { _id } : { questionId };
    const question = await QuestionModel.findOneAndUpdate(
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

// DELETE - Delete question (regulation from query for correct storage scope)
export async function DELETE(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const questionId = searchParams.get('questionId');
    const regulation = searchParams.get('regulation') || RegulationType.DORA;
    const QuestionModel = isLocalStorage() ? getQuestionModel(regulation) : Question;
    
    const query = id ? { _id: id } : questionId ? { questionId } : null;
    
    if (!query) {
      return NextResponse.json(
        { error: 'ID or questionId required' },
        { status: 400 }
      );
    }
    
    const result = await QuestionModel.deleteOne(query);
    
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
