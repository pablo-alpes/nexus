import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import QuestionnaireResponse from '@/models/QuestionnaireResponse';
import Control from '@/models/Control';
import Question from '@/models/Question';
import DORARequirement from '@/models/DORARequirement';
import { getAuthUser } from '@/lib/auth-helper';
import { ensureControlsSetup } from '@/lib/auto-controls';

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
    
    // Step 3: For "no" answers, find requirements and map to controls
    const requirementsFromNoAnswers = new Set<string>();
    const requirementsFromYesAnswers = new Set<string>();
    
    // Process "no" answers: find requirements → include controls
    for (const { question, answer } of noAnswers) {
      // Find requirements related to this question
      const allRequirements = await DORARequirement.find({ pillar: question.pillar });
      const questionKeywords = question.text?.toLowerCase().split(' ').filter((w: string) => w.length > 3) || [];
      
      // Find requirements that match the question's keywords
      const matchingRequirements = allRequirements.filter((req: any) => {
        const reqText = `${req.description || ''} ${req.title || ''}`.toLowerCase();
        return questionKeywords.some((keyword: string) => reqText.includes(keyword));
      });
      
      matchingRequirements.forEach((req: any) => {
        requirementsFromNoAnswers.add(String(req._id || req.requirementId));
      });
      
      // Also check if question has controls mapped via options
      if (question.options) {
        const noOption = question.options.find((opt: any) => opt.value === 'no');
        if (noOption && noOption.applicableControls) {
          // These are requirement IDs, add them
          noOption.applicableControls.forEach((reqId: any) => {
            requirementsFromNoAnswers.add(String(reqId));
          });
        }
      }
    }
    
    // Process "yes" answers: find requirements (for conflict resolution)
    for (const { question, answer } of yesAnswers) {
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
    
    // Step 4: Find controls that map to requirements from "no" answers
    const applicableControlIds = new Set<string>();
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
      });
    }
    
    const applicableControls = Array.from(applicableControlIds);
    
    console.log(`📊 Control Calculation Results:`);
    console.log(`   No answers: ${noAnswers.length}`);
    console.log(`   Yes answers: ${yesAnswers.length}`);
    console.log(`   Requirements from no answers: ${requirementsFromNoAnswers.size}`);
    console.log(`   Conflicting requirements: ${conflictingRequirements.size}`);
    console.log(`   Final applicable controls: ${applicableControls.length}`);
    
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
      completedAt: new Date().toISOString(),
    };
    
    const response = await QuestionnaireResponse.findOneAndUpdate(
      { userId: String(payload.userId) },
      responseData,
      { upsert: true, new: true }
    );
    
    return NextResponse.json({
      response,
      applicableControlsCount: applicableControls.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

