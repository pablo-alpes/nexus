import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal, isLocalStorage } from '@/lib/mongodb-local';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import Question, { getQuestionModel } from '@/models/Question';
import { getAuthUser } from '@/lib/auth-helper';
import { ensureControlsSetup } from '@/lib/auto-controls';
import { getPrecomputedMappings, getActiveRuleVersion } from '@/lib/services/precomputed-mappings';
import { RegulationType } from '@/lib/regulations';
import { computeQuestionnaireControlMapping } from '@/lib/compliance-engine';

// GET user's questionnaire response
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = user;
    
    // Local storage doesn't support populate
    const response = await QuestionnaireResponse.findOne({ userId: String(payload.userId) });
    
    if (!response) {
      return NextResponse.json({ response: null });
    }
    
    return NextResponse.json({ response });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE user's questionnaire response
export async function DELETE(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = user;
    
    // Delete the questionnaire response
    await QuestionnaireResponse.deleteOne({ userId: String(payload.userId) });
    
    return NextResponse.json({ 
      success: true,
      message: 'Questionnaire response cleared successfully' 
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Submit questionnaire response
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    // Ensure controls are created before processing questionnaire
    await ensureControlsSetup();
    
    // Check auth (bypassed in test mode)
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = user;
    const body = await request.json();
    const regulationType = (body.regulation as RegulationType) || RegulationType.DORA;
    const QuestionModel = isLocalStorage() ? getQuestionModel(regulationType) : Question;
    const ruleVersion = await getActiveRuleVersion(regulationType);

    const answerArray: Array<{ questionId: string; value: string; textValue?: string }> = body.answers.map((a: any) => ({
      questionId: String(a.questionId),
      value: a.value,
      textValue: a.textValue,
    }));

    const mapping = await computeQuestionnaireControlMapping(answerArray, regulationType);
    const applicableControls = mapping.applicableControlIds;
    const reasoningObject = mapping.controlReasoning;

    const noAnswers = answerArray.filter((a: { value: string }) => a.value === 'no');
    const yesAnswers = answerArray.filter((a: { value: string }) => a.value === 'yes');

    console.log(`📊 Control Calculation Results:`);
    console.log(`   No answers: ${noAnswers.length}`);
    console.log(`   Yes answers: ${yesAnswers.length}`);
    console.log(`   Requirements from no answers: ${mapping.requirementsFromNoAnswers.length}`);
    console.log(`   Final applicable controls: ${applicableControls.length}`);
    
    const allQuestionIds = new Set(answerArray.map((a: { questionId: string }) => String(a.questionId)));
    const mappingCompleteness = {
      totalQuestions: allQuestionIds.size,
      questionsProcessed: noAnswers.length,
      questionsWithMappings: 0,
      questionsWithoutMappings: 0,
      questionsWithEmptyMappings: 0,
      totalRequirementsFound: mapping.requirementsFromNoAnswers.length,
      mappingCoverage: 0,
    };

    const allQuestions = await QuestionModel.find({});
    const answeredQuestions = allQuestions.filter(
      (q: any) => allQuestionIds.has(String(q._id)) || allQuestionIds.has(String(q.questionId))
    );

    for (const question of answeredQuestions) {
      const precomputed = await getPrecomputedMappings(question.questionId, ruleVersion, regulationType);
      if (precomputed) {
        if (precomputed.controlBasedRequirements.length > 0) {
          mappingCompleteness.questionsWithMappings++;
        } else {
          mappingCompleteness.questionsWithEmptyMappings++;
        }
      } else {
        mappingCompleteness.questionsWithoutMappings++;
      }
    }

    // Calculate coverage based on ALL questions, not just "No" answers
    mappingCompleteness.mappingCoverage = mappingCompleteness.totalQuestions > 0
      ? (mappingCompleteness.questionsWithMappings / mappingCompleteness.totalQuestions) * 100
      : 0;
    
    // Save or update response
    // Convert userId to string for local storage
    const responseData = {
      userId: String(payload.userId),
      answers: answerArray,
      applicableControls: applicableControls.map((id: any) => String(id)),
      controlReasoning: reasoningObject, // Store reasoning for transparency
      completedAt: new Date().toISOString(),
    };
    
    const response = await QuestionnaireResponse.findOneAndUpdate(
      { userId: String(payload.userId) },
      responseData,
      { upsert: true, new: true }
    );
    
    let coherenceMetrics = null;
    if (answeredQuestions.length > 0) {
      try {
        const precomputed = await getPrecomputedMappings(answeredQuestions[0].questionId, ruleVersion, regulationType);
        coherenceMetrics = precomputed?.coherenceMetrics || null;
      } catch (error) {
        console.warn('Could not fetch coherence metrics:', error);
      }
    }

    // Auto-generate gap analysis for all pillars (non-blocking for response)
    let gapAnalysisSummary = null;
    try {
      const baseUrl = request.nextUrl.origin;
      const cookie = request.headers.get('cookie') || '';
      const authHeader = request.headers.get('authorization') || '';
      const gaResponse = await fetch(`${baseUrl}/api/gap-analysis/generate-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { cookie } : {}),
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        body: JSON.stringify({ regulation: regulationType }),
      });
      if (gaResponse.ok) {
        gapAnalysisSummary = await gaResponse.json();
      }
    } catch (error) {
      console.warn('Auto gap analysis generation skipped:', error);
    }
    
    return NextResponse.json({
      response,
      applicableControlsCount: applicableControls.length,
      controlReasoning: reasoningObject,
      ruleVersion,
      coherenceMetrics,
      mappingCompleteness,
      gapAnalysisSummary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

