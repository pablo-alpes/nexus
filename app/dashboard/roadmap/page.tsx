'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import UserContextBar from '@/components/UserContextBar';

const DORA_PILLARS = [
  { value: 'ICT_RISK_MANAGEMENT', label: 'ICT Risk Management', color: 'bg-blue-500' },
  { value: 'INCIDENT_MANAGEMENT', label: 'Incident Management', color: 'bg-red-500' },
  { value: 'RESILIENCE_TESTING', label: 'Resilience Testing', color: 'bg-green-500' },
  { value: 'THIRD_PARTY_RISK', label: 'Third Party Risk', color: 'bg-yellow-500' },
  { value: 'INFORMATION_SHARING', label: 'Information Sharing', color: 'bg-purple-500' },
];

interface RoadmapTask {
  taskId: string;
  title: string;
  description: string;
  pillar: string;
  controlId?: string;
  requirementId?: string;
  remediationActionId?: string;
  startDate: string;
  endDate: string;
  duration: number;
  assignedTo?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dependencies?: string[];
  progress?: number;
  notes?: string;
}

interface Roadmap {
  _id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  tasks: RoadmapTask[];
}

export default function RoadmapPage() {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [editingTask, setEditingTask] = useState<RoadmapTask | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadRoadmap();
  }, []);

  const loadRoadmap = async () => {
    setLoading(true);
    try {
      const response = await apiRequest<{ roadmap: Roadmap }>('/roadmap');
      if (response.roadmap) {
        setRoadmap(response.roadmap);
      }
    } catch (error) {
      console.error('Failed to load roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRoadmap = async () => {
    setGenerating(true);
    try {
      const response = await apiRequest<{ roadmap: Roadmap; summary: any }>('/roadmap', {
        method: 'POST',
        body: JSON.stringify({ regenerate: true }),
      });
      setRoadmap(response.roadmap);
      alert(`Roadmap generated with ${response.summary?.totalTasks || 0} tasks.`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskClick = (task: RoadmapTask) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleTaskUpdate = async () => {
    if (!editingTask) return;

    try {
      // Extract only the changed fields (excluding taskId)
      const { taskId, ...updates } = editingTask;
      
      await apiRequest('/roadmap', {
        method: 'PUT',
        body: JSON.stringify({
          taskId: editingTask.taskId,
          updates,
        }),
      });
      
      // Reload roadmap
      await loadRoadmap();
      setShowEditModal(false);
      setEditingTask(null);
    } catch (error: any) {
      alert(`Error updating task: ${error.message}`);
    }
  };

  // Generate months between start and end date
  const months = useMemo(() => {
    if (!roadmap) return [];
    
    const start = new Date(roadmap.startDate);
    const end = new Date(roadmap.endDate);
    const monthsList = [];
    
    const current = new Date(start);
    current.setDate(1); // Start of month
    
    while (current <= end) {
      monthsList.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    
    return monthsList;
  }, [roadmap]);

  // Filter tasks by pillar
  const filteredTasks = useMemo(() => {
    if (!roadmap) return [];
    if (!selectedPillar) return roadmap.tasks;
    return roadmap.tasks.filter(t => t.pillar === selectedPillar);
  }, [roadmap, selectedPillar]);

  // Group tasks by pillar
  const tasksByPillar = useMemo(() => {
    const grouped: Record<string, RoadmapTask[]> = {};
    filteredTasks.forEach(task => {
      if (!grouped[task.pillar]) {
        grouped[task.pillar] = [];
      }
      grouped[task.pillar].push(task);
    });
    return grouped;
  }, [filteredTasks]);

  // Calculate task position and width in months
  const getTaskPosition = (task: RoadmapTask) => {
    if (!roadmap) return { left: 0, width: 0 };
    
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const roadmapStart = new Date(roadmap.startDate);
    
    // Calculate months from roadmap start
    const startMonth = (taskStart.getFullYear() - roadmapStart.getFullYear()) * 12 + 
                       (taskStart.getMonth() - roadmapStart.getMonth());
    
    // Calculate duration in months
    const durationMonths = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return {
      left: startMonth * 200, // 200px per month
      width: Math.max(durationMonths * 200, 100), // Minimum 100px width
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'BLOCKED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'border-l-4 border-red-600';
      case 'HIGH': return 'border-l-4 border-orange-600';
      case 'MEDIUM': return 'border-l-4 border-yellow-600';
      default: return 'border-l-4 border-gray-400';
    }
  };

  const getPillarColor = (pillar: string) => {
    const pillarObj = DORA_PILLARS.find(p => p.value === pillar);
    return pillarObj?.color || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
                Nexus Cloud
              </Link>
              <Link href="/dashboard/roadmap" className="text-gray-700 hover:text-primary-600">
                Roadmap
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* User Context Bar */}
      <UserContextBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Implementation Roadmap</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gantt chart view of remediation tasks grouped by DORA pillar
            </p>
          </div>
          <div className="flex gap-2">
            {!roadmap && (
              <button
                onClick={generateRoadmap}
                disabled={generating}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate from Remediation Plans'}
              </button>
            )}
            {roadmap && (
              <button
                onClick={generateRoadmap}
                disabled={generating}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {generating ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
          </div>
        </div>

        {/* Filter by Pillar */}
        {roadmap && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Pillar
            </label>
            <select
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Pillars</option>
              {DORA_PILLARS.map((pillar) => (
                <option key={pillar.value} value={pillar.value}>
                  {pillar.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Gantt Chart */}
        {loading ? (
          <div className="text-center py-8">Loading roadmap...</div>
        ) : !roadmap ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No roadmap found. Generate one from your remediation plans.</p>
            <button
              onClick={generateRoadmap}
              disabled={generating}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Roadmap'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            {/* Timeline Header */}
            <div className="sticky top-0 bg-gray-100 z-10 border-b">
              <div className="flex" style={{ minWidth: `${months.length * 200}px` }}>
                <div className="w-64 p-4 font-semibold border-r">Task / Pillar</div>
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="w-[200px] p-4 text-center border-r border-gray-300"
                  >
                    <div className="font-semibold">
                      {month.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {month.getFullYear()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks by Pillar */}
            <div className="divide-y">
              {Object.entries(tasksByPillar).map(([pillar, tasks]) => {
                const pillarObj = DORA_PILLARS.find(p => p.value === pillar);
                return (
                  <div key={pillar} className="border-b">
                    {/* Pillar Header */}
                    <div className="flex items-center bg-gray-50 p-2">
                      <div
                        className={`w-4 h-4 rounded mr-2 ${getPillarColor(pillar)}`}
                      />
                      <div className="font-semibold text-gray-700">
                        {pillarObj?.label || pillar} ({tasks.length} tasks)
                      </div>
                    </div>

                    {/* Tasks in this pillar */}
                    {tasks.map((task) => {
                      const position = getTaskPosition(task);
                      return (
                        <div
                          key={task.taskId}
                          className="flex items-center hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="w-64 p-3 border-r flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(task.status)}`} />
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium truncate ${getPriorityColor(task.priority)} pl-2`}>
                                {task.title}
                              </div>
                              {task.assignedTo && (
                                <div className="text-xs text-gray-500 mt-1">
                                  👤 {task.assignedTo}
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            className="relative flex-1"
                            style={{ minWidth: `${months.length * 200}px` }}
                          >
                            <div
                              className={`absolute h-8 rounded ${getStatusColor(task.status)} opacity-80 hover:opacity-100 transition-opacity`}
                              style={{
                                left: `${position.left}px`,
                                width: `${position.width}px`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                              }}
                              title={`${task.title}\n${task.startDate} - ${task.endDate}\nProgress: ${task.progress || 0}%`}
                            >
                              <div className="h-full flex items-center px-2 text-white text-xs font-medium truncate">
                                {task.title}
                              </div>
                              {task.progress && task.progress > 0 && (
                                <div
                                  className="absolute bottom-0 left-0 bg-white bg-opacity-50 h-1 rounded"
                                  style={{ width: `${task.progress}%` }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {showEditModal && editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Edit Task</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTask(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editingTask.description}
                      onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={editingTask.startDate.split('T')[0]}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          setEditingTask({
                            ...editingTask,
                            startDate: newDate.toISOString(),
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={editingTask.endDate.split('T')[0]}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          setEditingTask({
                            ...editingTask,
                            endDate: newDate.toISOString(),
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assigned To
                      </label>
                      <input
                        type="text"
                        value={editingTask.assignedTo || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, assignedTo: e.target.value })}
                        placeholder="Enter name or email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editingTask.status}
                        onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="BLOCKED">Blocked</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={editingTask.priority}
                        onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Progress (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingTask.progress || 0}
                        onChange={(e) => setEditingTask({ ...editingTask, progress: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={editingTask.notes || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTask(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleTaskUpdate(editingTask)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

