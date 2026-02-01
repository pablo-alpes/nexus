import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import Control from '@/models/Control';
import Question from '@/models/Question';
import DORARequirement from '@/models/DORARequirement';
import { getAuthUser } from '@/lib/auth-helper';
import { ensureControlsSetup } from '@/lib/auto-controls';
import { getPrecomputedMappings, getActiveRuleVersion } from '@/lib/services/precomputed-mappings';
import { RequirementOperations } from '@/lib/model-operations';
import { RegulationType } from '@/lib/regulations';

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
    
    // NEW LOGIC: Calculate controls at the end after processing all answers
    // Step 1: Collect all "no" and "yes" answers first
    const noAnswers: Array<{ question: any; answer: any }> = [];
    const yesAnswers: Array<{ question: any; answer: any }> = [];
    const notApplicableAnswers: Array<{ question: any; answer: any }> = [];
    
    // Step 2: Process all answers and categorize them
    for (const answer of body.answers) {
      const question = await Question.findOne({ _id: answer.questionId });
      if (!question) continue;
      
      if (answer.value === 'no') {
        noAnswers.push({ question, answer });
      } else if (answer.value === 'yes') {
        yesAnswers.push({ question, answer });
      } else if (answer.value === 'not_applicable') {
        notApplicableAnswers.push({ question, answer });
      }
    }
    
    // Step 3: Detect regulation from questions
    // Check if any question has regulationType or starts with Q-PRIV-
    const sampleQuestion = noAnswers.length > 0 ? noAnswers[0].question : (yesAnswers.length > 0 ? yesAnswers[0].question : null);
    const isChileanPrivacy = sampleQuestion && (
      sampleQuestion.regulationType === 'CHILEAN_PRIVACY' ||
      sampleQuestion.questionId?.startsWith('Q-PRIV-')
    );
    const regulationType = isChileanPrivacy ? RegulationType.CHILEAN_PRIVACY : RegulationType.DORA;
    
    // For "no" answers, find requirements using HYBRID APPROACH (Logic + NLP)
    const requirementsFromNoAnswers = new Set<string>();
    const requirementsFromYesAnswers = new Set<string>();
    const ruleVersion = await getActiveRuleVersion(regulationType);
    
    // Process "no" answers: use precomputed mappings (control-based + NLP validated)
    for (const { question, answer } of noAnswers) {
      // Try to get precomputed mappings first
      const precomputed = await getPrecomputedMappings(question.questionId, ruleVersion);
      
      if (precomputed && precomputed.controlBasedRequirements.length > 0) {
        // Use precomputed control-based requirements (high confidence)
        precomputed.controlBasedRequirements.forEach((reqId: string) => {
          requirementsFromNoAnswers.add(reqId);
        });
        
        // Also include high-confidence NLP suggestions (similarity > 0.75, not already in control-based)
        const highConfidenceSuggestions = precomputed.nlpSimilarities
          .filter(s => !s.isControlBased && s.confidence === 'high' && s.similarity >= 0.75)
          .map(s => s.requirementId);
        
        highConfidenceSuggestions.forEach((reqId: string) => {
          requirementsFromNoAnswers.add(reqId);
        });
      } else {
        // Fallback: Use keyword matching if precomputed mappings not available
        console.warn(`⚠️  No precomputed mappings for ${question.questionId}, using keyword fallback`);
        const allRequirements = await RequirementOperations.findByRegulation(regulationType, { pillar: question.pillar });
        const questionKeywords = question.text?.toLowerCase().split(' ').filter((w: string) => w.length > 3) || [];
        
        const matchingRequirements = allRequirements.filter((req: any) => {
          const reqText = `${req.description || ''} ${req.title || ''}`.toLowerCase();
          return questionKeywords.some((keyword: string) => reqText.includes(keyword));
        });
        
        matchingRequirements.forEach((req: any) => {
          requirementsFromNoAnswers.add(String(req._id || req.requirementId));
        });
      }
    }
    
    // Process "yes" answers: use precomputed mappings for conflict detection
    for (const { question, answer } of yesAnswers) {
      const precomputed = await getPrecomputedMappings(question.questionId, ruleVersion);
      
      if (precomputed && precomputed.controlBasedRequirements.length > 0) {
        // Use precomputed control-based requirements
        precomputed.controlBasedRequirements.forEach((reqId: string) => {
          requirementsFromYesAnswers.add(reqId);
        });
      } else {
        // Fallback: keyword matching
        const allRequirements = await RequirementOperations.findByRegulation(regulationType, { pillar: question.pillar });
        const questionKeywords = question.text?.toLowerCase().split(' ').filter((w: string) => w.length > 3) || [];
        
        const matchingRequirements = allRequirements.filter((req: any) => {
          const reqText = `${req.description || ''} ${req.title || ''}`.toLowerCase();
          return questionKeywords.some((keyword: string) => reqText.includes(keyword));
        });
        
        matchingRequirements.forEach((req: any) => {
          requirementsFromYesAnswers.add(String(req._id || req.requirementId));
        });
      }
    }
    
    // Step 4: Find controls that map to requirements from "no" answers
    const applicableControlIds = new Set<string>();
    const controlReasoning = new Map<string, string[]>(); // Track reasoning for each control
    const requirementIdsArray = Array.from(requirementsFromNoAnswers);
    
    if (requirementIdsArray.length > 0) {
      // Normalize requirement IDs - create a set with all possible ID formats
      // Precomputed mappings return requirementId strings, but controls might have _id or requirementId
      const normalizedReqIds = new Set<string>();
      const reqIdMap = new Map<string, string>(); // Maps any ID format to canonical requirementId
      
      // Get all requirements to build ID mapping (more efficient than per-control lookups)
      // Use RequirementOperations to get requirements for the correct regulation
      const allReqs = await RequirementOperations.findByRegulation(regulationType, {
        $or: [
          { requirementId: { $in: requirementIdsArray } },
          { _id: { $in: requirementIdsArray } },
        ],
      });
      
      // Build normalized ID set and mapping
      for (const reqId of requirementIdsArray) {
        normalizedReqIds.add(reqId);
        const req = allReqs.find((r: any) => 
          String(r._id) === reqId || r.requirementId === reqId
        );
        if (req) {
          const reqIdStr = String(req._id);
          const reqRequirementId = req.requirementId || '';
          normalizedReqIds.add(reqIdStr);
          if (reqRequirementId) {
            normalizedReqIds.add(reqRequirementId);
            reqIdMap.set(reqIdStr, reqRequirementId);
            reqIdMap.set(reqRequirementId, reqRequirementId);
            reqIdMap.set(reqId, reqRequirementId);
          }
        }
      }
      
      // Get controls only from pillars that have "no" answers (more efficient)
      const pillarsFromNoAnswers = new Set(noAnswers.map(({ question }) => question.pillar).filter(Boolean));
      const allControls = await Control.find({
        pillar: { $in: Array.from(pillarsFromNoAnswers) },
      });
      
      // Match controls to requirements
      for (const control of allControls) {
        if (!control.requirementIds || !Array.isArray(control.requirementIds)) {
          continue;
        }
        
        // Check if control maps to any requirement from "no" answers
        const matchingReqs: string[] = [];
        
        for (const controlReqId of control.requirementIds) {
          const controlReqIdStr = String(controlReqId);
          
          // Direct match
          if (normalizedReqIds.has(controlReqIdStr)) {
            const canonicalId = reqIdMap.get(controlReqIdStr) || controlReqIdStr;
            if (!matchingReqs.includes(canonicalId)) {
              matchingReqs.push(canonicalId);
            }
          } else {
            // Try to find requirement by this ID
            const req = allReqs.find((r: any) => 
              String(r._id) === controlReqIdStr || r.requirementId === controlReqIdStr
            );
            if (req) {
              const reqIdStr = String(req._id);
              const reqRequirementId = req.requirementId || '';
              if (normalizedReqIds.has(reqIdStr) || normalizedReqIds.has(reqRequirementId)) {
                const canonicalId = reqRequirementId || reqIdStr;
                if (!matchingReqs.includes(canonicalId)) {
                  matchingReqs.push(canonicalId);
                }
              }
            }
          }
        }
        
        // If control matches any requirement, include it
        if (matchingReqs.length > 0) {
          const controlId = String(control._id || control.controlId);
          applicableControlIds.add(controlId);
          if (control.controlId && String(control.controlId) !== controlId) {
            applicableControlIds.add(String(control.controlId));
          }
          
          // Track reasoning: which questions/requirements led to this control
          const questionTexts = noAnswers
            .filter(({ question }) => question.pillar === control.pillar)
            .map(({ question }) => question.text)
            .slice(0, 2);
          
          if (!controlReasoning.has(controlId)) {
            controlReasoning.set(controlId, []);
          }
          controlReasoning.get(controlId)!.push(
            `Included because: Answered "No" to questions about ${questionTexts.join(', ')} → Requirements ${matchingReqs.slice(0, 3).join(', ')} → Control ${control.controlId || controlId}`
          );
        }
      }
    }
    
    // Step 5: Apply prudence criteria for conflicts
    // If a requirement is in both "no" and "yes" answers, include the control (prudence)
    // This ensures we don't miss controls that might be needed
    const conflictingRequirements = new Set<string>();
    requirementsFromNoAnswers.forEach(reqId => {
      if (requirementsFromYesAnswers.has(reqId)) {
        conflictingRequirements.add(reqId);
      }
    });
    
    if (conflictingRequirements.size > 0) {
      console.log(`⚠️  Found ${conflictingRequirements.size} conflicting requirements (in both yes and no). Using prudence: including controls.`);
      
      // Include controls for conflicting requirements (prudence criteria)
      const conflictingReqIds = Array.from(conflictingRequirements);
      const conflictingControls = await Control.find({
        requirementIds: { $in: conflictingReqIds }
      });
      
      conflictingControls.forEach((control: any) => {
        const controlId = String(control._id || control.controlId);
        applicableControlIds.add(controlId);
        if (control.controlId && String(control.controlId) !== controlId) {
          applicableControlIds.add(String(control.controlId));
        }
        
        // Track prudence reasoning
        if (!controlReasoning.has(controlId)) {
          controlReasoning.set(controlId, []);
        }
        controlReasoning.get(controlId)!.push(
          `Included via prudence criteria: Requirement appears in both "Yes" and "No" answers → Conservative approach: include control ${control.controlId || controlId}`
        );
      });
    }
    
    const applicableControls = Array.from(applicableControlIds);
    
    console.log(`📊 Control Calculation Results:`);
    console.log(`   No answers: ${noAnswers.length}`);
    console.log(`   Yes answers: ${yesAnswers.length}`);
    console.log(`   Requirements from no answers: ${requirementsFromNoAnswers.size}`);
    console.log(`   Conflicting requirements: ${conflictingRequirements.size}`);
    console.log(`   Final applicable controls: ${applicableControls.length}`);
    
    // Convert reasoning map to object for storage
    const reasoningObject: Record<string, string[]> = {};
    controlReasoning.forEach((reasons, controlId) => {
      reasoningObject[controlId] = reasons;
    });
    
    // Calculate mapping completeness for ALL questions in the questionnaire
    // This gives a true picture of mapping coverage, not just for "No" answers
    const allQuestionIds = new Set(body.answers.map((a: any) => String(a.questionId)));
    const mappingCompleteness = {
      totalQuestions: allQuestionIds.size,
      questionsProcessed: noAnswers.length, // Keep for reference (No answers that were processed)
      questionsWithMappings: 0,
      questionsWithoutMappings: 0,
      questionsWithEmptyMappings: 0,
      totalRequirementsFound: requirementsFromNoAnswers.size,
      mappingCoverage: 0,
    };

    // Check ALL questions in the questionnaire, not just "No" answers
    // This ensures the percentage reflects the true coverage across all questions
    const allQuestions = await Question.find({ 
      _id: { $in: Array.from(allQuestionIds) } 
    });
    
    for (const question of allQuestions) {
      const precomputed = await getPrecomputedMappings(question.questionId, ruleVersion);
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
      answers: body.answers.map((a: any) => ({
        questionId: String(a.questionId),
        value: a.value,
        textValue: a.textValue,
      })),
      applicableControls: applicableControls.map((id: any) => String(id)),
      controlReasoning: reasoningObject, // Store reasoning for transparency
      completedAt: new Date().toISOString(),
    };
    
    const response = await QuestionnaireResponse.findOneAndUpdate(
      { userId: String(payload.userId) },
      responseData,
      { upsert: true, new: true }
    );
    
    // Get rule version and coherence metrics for response
    let coherenceMetrics = null;
    if (noAnswers.length > 0 && noAnswers[0].question) {
      try {
        const precomputed = await getPrecomputedMappings(noAnswers[0].question.questionId, ruleVersion);
        coherenceMetrics = precomputed?.coherenceMetrics || null;
      } catch (error) {
        console.warn('Could not fetch coherence metrics:', error);
      }
    }
    
    return NextResponse.json({
      response,
      applicableControlsCount: applicableControls.length,
      controlReasoning: reasoningObject, // Return reasoning for frontend display
      ruleVersion, // Include rule version used
      coherenceMetrics, // Include coherence metrics if available
      mappingCompleteness, // Include mapping completeness metrics
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

