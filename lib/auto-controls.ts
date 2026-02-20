/**
 * Auto-setup controls - creates DORA controls from ISO standards mapped to DORA requirements
 */

import { connectDBLocal, isLocalStorage } from './mongodb-local';
import Control, { getControlModel } from '@/models/Control';
import DORARequirement from '@/models/DORARequirement';
import Question, { getQuestionModel } from '@/models/Question';
import { RegulationType } from './regulations';
import fs from 'fs';
import path from 'path';

// Reset these flags on module reload to allow re-creation if needed
let controlsSetupCompleted = false;
let controlsSetupInProgress = false;

// Allow manual reset via environment variable or explicit call
export function resetControlsSetupFlag() {
  controlsSetupCompleted = false;
  controlsSetupInProgress = false;
  console.log('🔄 Controls setup flag reset');
}

export async function ensureControlsSetup(): Promise<void> {
  if (controlsSetupInProgress) {
    // Wait for in-progress setup to complete
    while (controlsSetupInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  try {
    await connectDBLocal();
    const ControlModel = isLocalStorage() ? getControlModel(RegulationType.DORA) : Control;
    
    const controlCount = await ControlModel.countDocuments();
    if (controlCount > 0) {
      controlsSetupCompleted = true;
      console.log(`✅ Controls already exist (${controlCount} controls)`);
      return;
    }
    
    // If flag was set but no controls exist, reset it
    if (controlsSetupCompleted) {
      console.log('⚠️  Controls flag was set but no controls found. Recreating...');
      controlsSetupCompleted = false;
    }

    controlsSetupInProgress = true;
    console.log('🔧 No controls found, creating controls from ISO standards (27002, 27005, 22301, 27017, 27018, 31000, 20000)...');
    
    // Ensure requirements exist first
    const reqCount = await DORARequirement.countDocuments();
    if (reqCount === 0) {
      console.log('⚠️  No requirements found. Please import requirements first.');
      controlsSetupInProgress = false;
      controlsSetupCompleted = false;
      return;
    }
    
    console.log(`📋 Found ${reqCount} requirements, creating controls from ISO standards...`);
    await createControlsFromISOStandards();
    
    console.log('🔗 Updating questions with control mappings...');
    await updateQuestionsWithControls();
    
    controlsSetupCompleted = true;
    controlsSetupInProgress = false;
    console.log('✅ Controls setup completed successfully!');
  } catch (error: any) {
    console.error('❌ Controls setup failed:', error.message);
    console.error(error.stack);
    controlsSetupInProgress = false;
    // Don't throw - allow app to continue
  }
}

async function createControlsFromISOStandards(): Promise<void> {
  const ControlModel = isLocalStorage() ? getControlModel(RegulationType.DORA) : Control;
  const isoControlsPath = path.join(process.cwd(), 'data', 'iso27002-controls.json');
  
  if (!fs.existsSync(isoControlsPath)) {
    console.log('⚠️  ISO 27002 controls file not found, creating basic controls from requirements...');
    await createControlsFromRequirements();
    return;
  }
  
  const isoControlsData = JSON.parse(fs.readFileSync(isoControlsPath, 'utf8'));
  const isoControls = isoControlsData.controls || [];
  
  console.log(`📚 Loaded ${isoControls.length} ISO controls from ${isoControlsData.metadata?.standard || 'multiple standards'}`);
  
  // Get all requirements to map
  const allRequirements = await DORARequirement.find();
  const requirementsMap = new Map();
  allRequirements.forEach(req => {
    const reqId = String(req._id || req.requirementId);
    requirementsMap.set(req.requirementId, req);
    requirementsMap.set(reqId, req);
  });
  
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const isoControl of isoControls) {
    try {
      // Map DORA requirements to this control
      const mappedRequirementIds: string[] = [];
      
      if (isoControl.doraRequirements && Array.isArray(isoControl.doraRequirements)) {
        for (const reqId of isoControl.doraRequirements) {
          const req = requirementsMap.get(reqId);
          if (req) {
            const reqDbId = String(req._id || req.requirementId);
            if (!mappedRequirementIds.includes(reqDbId)) {
              mappedRequirementIds.push(reqDbId);
            }
          }
        }
      }
      
      // If no specific requirements mapped, try to find by pillar
      if (mappedRequirementIds.length === 0 && isoControl.pillar) {
        const pillarReqs = allRequirements.filter(r => r.pillar === isoControl.pillar);
        
        if (pillarReqs.length > 0) {
          // Take first 5 requirements from this pillar as default mapping
          pillarReqs.slice(0, 5).forEach(req => {
            const reqDbId = String(req._id || req.requirementId);
            if (!mappedRequirementIds.includes(reqDbId)) {
              mappedRequirementIds.push(reqDbId);
            }
          });
        } else {
          // If no requirements for this pillar, map to ICT_RISK_MANAGEMENT as fallback
          // (since it's the most comprehensive pillar)
          const fallbackReqs = allRequirements.filter(r => r.pillar === 'ICT_RISK_MANAGEMENT');
          fallbackReqs.slice(0, 3).forEach(req => {
            const reqDbId = String(req._id || req.requirementId);
            if (!mappedRequirementIds.includes(reqDbId)) {
              mappedRequirementIds.push(reqDbId);
            }
          });
        }
      }
      
      // Check if control already exists
      const existing = await ControlModel.findOne({ controlId: isoControl.controlId });
      if (existing) {
        skippedCount++;
        continue;
      }
      
      // Determine ISO standard name for notes
      let standardName = 'ISO 27002';
      if (isoControl.controlId.includes('22301')) standardName = 'ISO 22301';
      else if (isoControl.controlId.includes('27017')) standardName = 'ISO 27017';
      else if (isoControl.controlId.includes('27018')) standardName = 'ISO 27018';
      else if (isoControl.controlId.includes('31000')) standardName = 'ISO 31000';
      else if (isoControl.controlId.includes('20000')) standardName = 'ISO 20000';
      else if (isoControl.controlId.includes('27005')) standardName = 'ISO 27005';
      
      // Create control
      const controlData = {
        controlId: isoControl.controlId,
        title: isoControl.title,
        description: isoControl.description,
        pillar: isoControl.pillar,
        requirementIds: mappedRequirementIds,
        controlType: isoControl.controlType || 'TRANSVERSAL',
        minCriticalityLevel: isoControl.minCriticalityLevel || 1,
        applicableAssetTypes: isoControl.applicableAssetTypes || undefined,
        questions: [],
        status: 'NOT_IMPLEMENTED',
        complianceStatus: 'NOT_APPLICABLE',
        iso27001Mappings: [{
          control: isoControl.iso27002Control,
          title: isoControl.title,
          description: isoControl.description,
          relevance: 'High',
        }],
        notes: `${standardName} Control ${isoControl.iso27002Control} - ${isoControl.category}`,
      };
      
      try {
        await ControlModel.create(controlData);
        createdCount++;
        
        if (createdCount % 20 === 0) {
          console.log(`   Created ${createdCount} controls...`);
        }
      } catch (createError: any) {
        console.error(`   ⚠️  Failed to create control ${isoControl.controlId}:`, createError.message);
        skippedCount++;
      }
    } catch (error: any) {
      console.error(`   ⚠️  Failed to create control ${isoControl.controlId}:`, error.message);
      skippedCount++;
    }
  }
  
  console.log(`✅ Created ${createdCount} controls from ISO standards`);
  if (skippedCount > 0) {
    console.log(`   Skipped ${skippedCount} controls (already exist or errors)`);
  }
  
  const finalCount = await ControlModel.countDocuments();
  if (finalCount === 0 && createdCount === 0) {
    console.error('⚠️  WARNING: No controls were created! Check for errors above.');
    throw new Error('Failed to create any controls');
  }
}

async function createControlsFromRequirements(): Promise<void> {
  const ControlModel = isLocalStorage() ? getControlModel(RegulationType.DORA) : Control;
  const requirements = await DORARequirement.find();
  let controlCounter = 1;
  
  // Group by pillar
  const requirementsByPillar: { [key: string]: any[] } = {};
  requirements.forEach(req => {
    if (!requirementsByPillar[req.pillar]) {
      requirementsByPillar[req.pillar] = [];
    }
    requirementsByPillar[req.pillar].push(req);
  });
  
  for (const [pillar, pillarReqs] of Object.entries(requirementsByPillar)) {
    for (const req of pillarReqs) {
      const controlId = `CTRL-${String(controlCounter).padStart(4, '0')}`;
      const reqId = req._id || req.requirementId;
      
      const controlData = {
        controlId: controlId,
        title: req.title || `Control for ${req.requirementId}`,
        description: req.description || req.legalText || '',
        pillar: pillar,
        requirementIds: [String(reqId)],
        controlType: 'TRANSVERSAL',
        minCriticalityLevel: 1,
        questions: [],
        status: 'NOT_IMPLEMENTED',
        complianceStatus: req.complianceStatus || 'NOT_APPLICABLE',
        iso27001Mappings: req.iso27001Mappings || [],
        notes: req.notes || null,
      };
      
      await ControlModel.create(controlData);
      controlCounter++;
    }
  }
  
  console.log(`✅ Created ${controlCounter - 1} controls from requirements (fallback)`);
}

async function updateQuestionsWithControls(): Promise<void> {
  const QuestionModel = isLocalStorage() ? getQuestionModel(RegulationType.DORA) : Question;
  const ControlModel = isLocalStorage() ? getControlModel(RegulationType.DORA) : Control;
  const questions = await QuestionModel.find();
  const requirements = await DORARequirement.find();
  const controls = await ControlModel.find();
  let updatedCount = 0;
  
  // Create a map of requirement IDs to control IDs
  const reqToControlMap = new Map<string, string[]>();
  controls.forEach(control => {
    if (control.requirementIds && Array.isArray(control.requirementIds)) {
      control.requirementIds.forEach((reqId: any) => {
        const reqIdStr = String(reqId);
        if (!reqToControlMap.has(reqIdStr)) {
          reqToControlMap.set(reqIdStr, []);
        }
        const controlId = String(control._id || control.controlId);
        reqToControlMap.get(reqIdStr)!.push(controlId);
      });
    }
  });
  
  for (const question of questions) {
    if (!question.options) continue;
    
    const yesOption = question.options.find(o => o.value === 'yes');
    if (!yesOption) continue;
    
    // Find requirements matching this question
    const pillarReqs = requirements.filter(r => r.pillar === question.pillar);
    const questionKeywords = question.text.toLowerCase().split(' ').filter(w => w.length > 3);
    
    const matchingRequirements = pillarReqs.filter(req => {
      const reqText = `${req.description || ''} ${req.title || ''}`.toLowerCase();
      return questionKeywords.some(keyword => reqText.includes(keyword));
    }).slice(0, 20);
    
    if (matchingRequirements.length > 0) {
      // Find controls that map to these requirements
      const matchingControlIds = new Set<string>();
      
      matchingRequirements.forEach(req => {
        const reqId = String(req._id || req.requirementId);
        const controlIds = reqToControlMap.get(reqId) || [];
        controlIds.forEach(cId => matchingControlIds.add(cId));
      });
      
      // Also find controls by pillar
      const pillarControls = controls.filter(c => c.pillar === question.pillar);
      pillarControls.slice(0, 10).forEach(c => {
        matchingControlIds.add(String(c._id || c.controlId));
      });
      
      if (matchingControlIds.size > 0) {
        yesOption.applicableControls = Array.from(matchingControlIds).slice(0, 20);
        const updatedOptions = question.options.map(opt => 
          opt.value === 'yes' ? yesOption : opt
        );
        await QuestionModel.findOneAndUpdate(
          { _id: question._id },
          { options: updatedOptions },
          { new: true }
        );
        updatedCount++;
      }
    }
  }
  
  console.log(`✅ Updated ${updatedCount} questions with control mappings`);
}
