import { NextRequest, NextResponse } from 'next/server';
import { connectDBLocal } from '@/lib/mongodb-local';
import Roadmap from '@/models/Roadmap';
import RemediationPlan from '@/models/RemediationPlan';
import Control from '@/models/Control';
import DORARequirement from '@/models/DORARequirement';
import { getAuthUser, getAuthUserContext } from '@/lib/auth-helper';
import { DORAPillar } from '@/models/DORARequirement';
import { canManageRoadmap } from '@/lib/permissions';
import { buildDataQuery, extractFilterParams } from '@/lib/query-helpers';

// GET roadmap for user
export async function GET(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const filterParams = extractFilterParams(request);
    let query: any;
    try {
      const result = await buildDataQuery(userContext, filterParams);
      query = result.query;
    } catch (error: any) {
      console.error('Error building data query:', error);
      return NextResponse.json(
        { error: 'Failed to build query: ' + error.message },
        { status: 500 }
      );
    }
    
    console.log('🗺️  Loading roadmap with query:', JSON.stringify(query, null, 2));
    
    const roadmap = await Roadmap.findOne(query);
    
    console.log(`🗺️  Found roadmap: ${roadmap ? 'YES' : 'NO'}`);
    
    return NextResponse.json({ roadmap });
  } catch (error: any) {
    console.error('Error fetching roadmap:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Generate roadmap from remediation plans
export async function POST(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to manage roadmap
    const permissionCheck = canManageRoadmap(userContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || 'Access denied',
        requiresPermission: 'canManageRoadmap'
      }, { status: 403 });
    }

    const filterParams = extractFilterParams(request);
    const body = await request.json();
    const { regenerate } = body;
    
    // Build query for remediation plans
    const { query: remediationQuery } = await buildDataQuery(userContext, filterParams);
    
    // Get all remediation plans for the user
    const remediationPlans = await RemediationPlan.find(remediationQuery);
    
    if (remediationPlans.length === 0) {
      return NextResponse.json(
        { error: 'No remediation plans found. Please generate remediation plans first.' },
        { status: 404 }
      );
    }
    
    // Build query for roadmap
    const { query: roadmapQuery } = await buildDataQuery(userContext, filterParams);
    
    // Check if roadmap already exists
    let roadmap = await Roadmap.findOne(roadmapQuery);
    
    if (roadmap && !regenerate) {
      return NextResponse.json({ roadmap });
    }
    
    // Generate tasks from remediation plans
    const tasks: any[] = [];
    const allPillars = new Set<DORAPillar>();
    let earliestStart = new Date();
    let latestEnd = new Date();
    
    for (const plan of remediationPlans) {
      allPillars.add(plan.pillar);
      
      if (plan.actions && Array.isArray(plan.actions)) {
        for (let i = 0; i < plan.actions.length; i++) {
          const action = plan.actions[i];
          
          // Calculate dates based on priority and order
          const baseStartDate = new Date(plan.startDate || new Date());
          const monthsOffset = i * 0.5; // Stagger tasks by 0.5 months
          const priorityMultiplier = {
            CRITICAL: 1,
            HIGH: 1.5,
            MEDIUM: 2,
            LOW: 3,
          }[action.priority] || 2;
          
          const startDate = new Date(baseStartDate);
          startDate.setMonth(startDate.getMonth() + Math.floor(monthsOffset));
          
          const duration = priorityMultiplier; // Duration in months
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + duration);
          
          // Update earliest and latest dates
          if (startDate < earliestStart) earliestStart = new Date(startDate);
          if (endDate > latestEnd) latestEnd = new Date(endDate);
          
          const taskId = `TASK-${plan.pillar}-${String(i + 1).padStart(3, '0')}`;
          
          tasks.push({
            taskId,
            title: action.action || `Implement ${action.controlTitle || 'Control'}`,
            description: action.description || action.gapDescription || '',
            pillar: plan.pillar,
            controlId: String(action.controlId),
            remediationActionId: `${plan.pillar}-${i}`,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            duration,
            assignedTo: action.assignedTo || null,
            status: action.status === 'COMPLETED' ? 'COMPLETED' : 
                   action.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_STARTED',
            priority: action.priority,
            dependencies: i > 0 ? [`TASK-${plan.pillar}-${String(i).padStart(3, '0')}`] : [],
            progress: action.status === 'COMPLETED' ? 100 : 
                     action.status === 'IN_PROGRESS' ? 50 : 0,
            notes: action.description,
          });
        }
      }
    }
    
    // Create or update roadmap
    const organizationId = filterParams?.organizationId || userContext.organizationId;
    const affiliateId = filterParams?.affiliateId || userContext.affiliateId;
    const legalFramework = filterParams?.legalFramework || 'DORA';
    
    const roadmapData: any = {
      userId: String(userContext.userId),
      legalFramework,
      name: 'DORA Implementation Roadmap',
      description: 'Implementation roadmap based on remediation plans',
      startDate: earliestStart.toISOString(),
      endDate: latestEnd.toISOString(),
      tasks,
    };
    
    // Always add organizationId/affiliateId from user context or filter params
    if (organizationId) {
      roadmapData.organizationId = String(organizationId);
    }
    if (affiliateId) {
      roadmapData.affiliateId = String(affiliateId);
    }
    
    console.log('💾 Saving roadmap with:', {
      userId: roadmapData.userId,
      organizationId: roadmapData.organizationId,
      affiliateId: roadmapData.affiliateId,
      legalFramework: roadmapData.legalFramework,
    });
    
    roadmap = await Roadmap.findOneAndUpdate(
      roadmapQuery,
      roadmapData,
      { upsert: true, new: true }
    );
    
    return NextResponse.json({
      roadmap,
      summary: {
        totalTasks: tasks.length,
        tasksByPillar: Array.from(allPillars).reduce((acc: any, pillar) => {
          acc[pillar] = tasks.filter(t => t.pillar === pillar).length;
          return acc;
        }, {}),
        startDate: earliestStart.toISOString(),
        endDate: latestEnd.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating roadmap:', error);
    return NextResponse.json(
      { error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}

// PUT - Update roadmap task
export async function PUT(request: NextRequest) {
  try {
    await connectDBLocal();
    
    const userContext = await getAuthUserContext(request);
    if (!userContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission to manage roadmap
    const permissionCheck = canManageRoadmap(userContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || 'Access denied',
        requiresPermission: 'canManageRoadmap'
      }, { status: 403 });
    }

    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { taskId, updates } = body;
    
    if (!taskId || !updates) {
      return NextResponse.json(
        { error: 'taskId and updates are required' },
        { status: 400 }
      );
    }
    
    const filterParams = extractFilterParams(request);
    const { query: roadmapQuery } = await buildDataQuery(userContext, filterParams);
    
    const roadmap = await Roadmap.findOne(roadmapQuery);
    
    if (!roadmap) {
      return NextResponse.json(
        { error: 'Roadmap not found' },
        { status: 404 }
      );
    }
    
    // Find and update the task
    const taskIndex = roadmap.tasks.findIndex((t: any) => t.taskId === taskId);
    
    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Update task
    const updatedTask = {
      ...roadmap.tasks[taskIndex],
      ...updates,
    };
    
    // If dates changed, recalculate duration
    if (updates.startDate || updates.endDate) {
      const startDate = new Date(updates.startDate || roadmap.tasks[taskIndex].startDate);
      const endDate = new Date(updates.endDate || roadmap.tasks[taskIndex].endDate);
      const monthsDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      updatedTask.duration = Math.max(0.5, Math.round(monthsDiff * 10) / 10); // Round to 0.1 months
    }
    
    roadmap.tasks[taskIndex] = updatedTask;
    
    // Recalculate roadmap dates
    const allStartDates = roadmap.tasks.map((t: any) => new Date(t.startDate));
    const allEndDates = roadmap.tasks.map((t: any) => new Date(t.endDate));
    roadmap.startDate = new Date(Math.min(...allStartDates));
    roadmap.endDate = new Date(Math.max(...allEndDates));
    
    // Build query for roadmap
    const { query: roadmapUpdateQuery } = await buildDataQuery(userContext, filterParams);
    
    // Update the roadmap
    const updatedRoadmap = await Roadmap.findOneAndUpdate(
      roadmapUpdateQuery,
      {
        tasks: roadmap.tasks,
        startDate: roadmap.startDate,
        endDate: roadmap.endDate,
      },
      { new: true }
    );
    
    return NextResponse.json({ roadmap: updatedRoadmap });
  } catch (error: any) {
    console.error('Error updating roadmap task:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

