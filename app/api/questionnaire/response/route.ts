import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import Control from '@/models/Control';
import Question from '@/models/Question';
import DORARequirement from '@/models/DORARequirement';
import { getAuthUser, getAuthUserContext } from '@/lib/auth-helper';
import { ensureControlsSetup } from '@/lib/auto-controls';
import { getPrecomputedMappings, getActiveRuleVersion } from '@/lib/services/precomputed-mappings';
import { createApprovalIfNeeded } from '@/lib/approval-helper';
import { ChangeType } from '@/models/ApprovalWorkflow';

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
    
    // Step 3: For "no" answers, find requirements using HYBRID APPROACH (Logic + NLP)
    const requirementsFromNoAnswers = new Set<string>();
    const requirementsFromYesAnswers = new Set<string>();
    const ruleVersion = await getActiveRuleVersion();
    
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
        const allRequirements = await DORARequirement.find({ pillar: question.pillar });
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
        const allRequirements = await DORARequirement.find({ pillar: question.pillar });
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
      // Find all controls that map to these requirements
      const allControls = await Control.find({
        requirementIds: { $in: requirementIdsArray }
      });
      
      // Also search by pillar for controls that might not have explicit requirement mapping
      const pillarsFromNoAnswers = new Set(noAnswers.map(({ question }) => question.pillar).filter(Boolean));
      
      for (const control of allControls) {
        const controlId = String(control._id || control.controlId);
        applicableControlIds.add(controlId);
        if (control.controlId && String(control.controlId) !== controlId) {
          applicableControlIds.add(String(control.controlId));
        }
        
        // Track reasoning: which questions/requirements led to this control
        const matchingReqs = Array.from(requirementsFromNoAnswers).filter(reqId => 
          control.requirementIds && control.requirementIds.some((rid: any) => String(rid) === reqId)
        );
        const questionTexts = noAnswers
          .filter(({ question }) => question.pillar === control.pillar)
          .map(({ question }) => question.text)
          .slice(0, 2);
        
        if (!controlReasoning.has(controlId)) {
          controlReasoning.set(controlId, []);
        }
        controlReasoning.get(controlId)!.push(
          `Included because: Answered "No" to questions about ${questionTexts.join(', ')} → Requirements ${matchingReqs.slice(0, 2).join(', ')} → Control ${control.controlId || controlId}`
        );
      }
      
      // Also get controls by pillar if they map to requirements from "no" answers
      for (const pillar of pillarsFromNoAnswers) {
        const pillarControls = await Control.find({ pillar });
        for (const control of pillarControls) {
          // Check if control maps to any requirement from "no" answers
          if (control.requirementIds && Array.isArray(control.requirementIds)) {
            const controlRequirementIds = control.requirementIds.map((id: any) => String(id));
            const hasMatchingRequirement = controlRequirementIds.some((reqId: string) => 
              requirementsFromNoAnswers.has(reqId)
            );
            
            if (hasMatchingRequirement) {
              const controlId = String(control._id || control.controlId);
              applicableControlIds.add(controlId);
              if (control.controlId && String(control.controlId) !== controlId) {
                applicableControlIds.add(String(control.controlId));
              }
              
              // Track reasoning
              const matchingReqs = Array.from(requirementsFromNoAnswers).filter(reqId => 
                controlRequirementIds.includes(reqId)
              );
              if (!controlReasoning.has(controlId)) {
                controlReasoning.set(controlId, []);
              }
              controlReasoning.get(controlId)!.push(
                `Included via pillar mapping: Requirements ${matchingReqs.slice(0, 2).join(', ')} → Control ${control.controlId || controlId}`
              );
            }
          }
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
    
    // Check if this is an update (existing response)
    const existingResponse = await QuestionnaireResponse.findOne({ userId: String(payload.userId) });
    const isUpdate = !!existingResponse;
    
    // Get user context for approval workflow
    const userContext = await getAuthUserContext(request);
    
    // Create approval workflow if needed (for material changes)
    let approvalWorkflow = null;
    if (isUpdate && userContext) {
      // Compare old and new answers to detect material changes
      const changeDetails: Array<{ field: string; oldValue: any; newValue: any }> = [];
      
      if (existingResponse.answers) {
        const oldAnswersMap = new Map(
          (existingResponse.answers as any[]).map((a: any) => [String(a.questionId), a.value])
        );
        
        body.answers.forEach((newAnswer: any) => {
          const oldValue = oldAnswersMap.get(String(newAnswer.questionId));
          if (oldValue !== newAnswer.value) {
            changeDetails.push({
              field: `answer_${newAnswer.questionId}`,
              oldValue,
              newValue: newAnswer.value,
            });
          }
        });
      }
      
      // If there are material changes, create approval workflow
      if (changeDetails.length > 0 && userContext) {
        try {
          approvalWorkflow = await createApprovalIfNeeded(
            userContext,
            ChangeType.QUESTIONNAIRE_RESPONSE,
            String(existingResponse._id || payload.userId),
            'QuestionnaireResponse',
            changeDetails,
            'Questionnaire response updated'
          );
        } catch (error) {
          console.warn('Failed to create approval workflow:', error);
        }
      }
    }
    
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
      approvalWorkflow: approvalWorkflow ? {
        workflowId: approvalWorkflow.workflowId,
        status: approvalWorkflow.status,
      } : null,
      requiresApproval: !!approvalWorkflow,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

