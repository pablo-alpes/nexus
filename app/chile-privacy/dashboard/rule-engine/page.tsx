'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { LanguageToggle } from '@/components/LanguageToggle';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RegulationType, getPillars } from '@/lib/regulations';
import * as XLSX from 'xlsx';

interface Mapping {
  questionId: string;
  controlBasedRequirements: string[];
  coherenceMetrics?: {
    averageRelevance: number;
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
    overallCoherence: number;
  };
}

interface RuleVersion {
  version: string;
}

interface Question {
  _id: string;
  questionId: string;
  text: string;
  pillar?: string;
  type?: string;
  order?: number;
  isRequired?: boolean;
  options?: Array<{ value: string; label: string }>;
}

interface Requirement {
  requirementId: string;
  _id?: string;
  title?: string;
  name?: string;
  description?: string;
  article?: string;
  chapter?: string;
  pillar?: string;
  associatedControlsCount?: number;
}

interface Control {
  controlId: string;
  _id?: string;
  title?: string;
  name?: string;
  description?: string;
  requirementIds?: string[];
  pillar?: string;
  controlType?: string;
  associatedRequirementsCount?: number;
}

interface EditModal {
  type: 'question' | 'requirement' | 'control' | null;
  item: any;
  isOpen: boolean;
}

interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RuleEnginePage() {
  const { language, t } = useTranslation();
  const [ruleVersion, setRuleVersion] = useState<RuleVersion | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [requirements, setRequirements] = useState<Record<string, Requirement>>({});
  const [allRequirements, setAllRequirements] = useState<Requirement[]>([]);
  const [controlsByRequirement, setControlsByRequirement] = useState<Record<string, Control[]>>({});
  const [allControls, setAllControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [organizeBy, setOrganizeBy] = useState<'questions' | 'requirements' | 'controls'>('questions');
  const [editModal, setEditModal] = useState<EditModal>({ type: null, item: null, isOpen: false });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });
  const [draggedItem, setDraggedItem] = useState<{ type: string; id: string; questionId?: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [addControlModal, setAddControlModal] = useState<{ isOpen: boolean; requirementId?: string; questionId?: string }>({ isOpen: false });
  
  // Get Chilean Privacy pillars from config
  const chileanPrivacyPillars = getPillars(RegulationType.CHILEAN_PRIVACY);
  const pillars = chileanPrivacyPillars.map(p => p.id);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Chilean Privacy regulation
      const regulationType = 'CHILEAN_PRIVACY';
      const regulationParam = `?regulation=${regulationType}`;
      
      const res = await apiRequest<{ ruleVersion: string; mappings: Mapping[]; warning?: string }>(`/rule-version/mappings${regulationParam}`);
      setRuleVersion({ version: res.ruleVersion });
      setMappings(res.mappings || []);
      if (res.warning) {
        console.warn('Rule engine warning:', res.warning);
      }
      // Load in order: requirements first, then controls (which need requirements for mapping)
      await loadQuestions(regulationType);
      await loadRequirements(regulationType);
      await loadControls(regulationType); // Load controls after requirements are loaded
    } catch (error) {
      console.error('Failed to load mappings', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (regulationType: string = 'CHILEAN_PRIVACY') => {
    try {
      const res = await apiRequest<{ questions: Question[] }>(`/questionnaire/questions?regulation=${regulationType}`);
      setQuestions(res.questions || []);
    } catch (error) {
      console.warn('Failed to load questions', error);
    }
  };

  const loadRequirements = async (regulationType: string = 'CHILEAN_PRIVACY') => {
    try {
      const res = await apiRequest<{ requirements: Requirement[] }>(`/requirements?includeCounts=true&regulation=${regulationType}`);
      console.log('Loaded requirements:', res.requirements?.length || 0, 'for regulation:', regulationType);
      const map: Record<string, Requirement> = {};
      const all: Requirement[] = [];
      (res.requirements || []).forEach((r) => {
        if (r.requirementId) {
          // Index by requirementId
          map[r.requirementId] = r;
          // Also index by _id if available (for matching with ObjectIds from controls)
          if (r._id) {
            map[String(r._id)] = r;
          }
          all.push(r);
        }
      });
      console.log('Processed requirements:', all.length);
      setRequirements(map);
      setAllRequirements(all);
      if (all.length === 0) {
        console.warn('No requirements found! Check API response:', res);
      }
    } catch (error) {
      console.error('Failed to load requirements:', error);
    }
  };

  const loadControls = async (regulationType: string = 'CHILEAN_PRIVACY') => {
    try {
      const res = await apiRequest<{ controls: Control[] }>(`/controls?includeCounts=true&regulation=${regulationType}`);
      const map: Record<string, Control[]> = {};
      const all: Control[] = [];
      
      // Get requirements that are already loaded or load them if needed
      let reqIdMap: Record<string, string> = {}; // Maps _id or any ID format to requirementId
      
      // Use already loaded requirements if available
      if (allRequirements.length > 0) {
        allRequirements.forEach((r) => {
          if (r.requirementId) {
            reqIdMap[r.requirementId] = r.requirementId;
            if (r._id) {
              reqIdMap[String(r._id)] = r.requirementId;
            }
          }
        });
      } else {
        // Fallback: load requirements if not already loaded
        const reqsRes = await apiRequest<{ requirements: Requirement[] }>(`/requirements?includeCounts=true&regulation=${regulationType}`);
        (reqsRes.requirements || []).forEach((r) => {
          if (r.requirementId) {
            reqIdMap[r.requirementId] = r.requirementId;
            if (r._id) {
              reqIdMap[String(r._id)] = r.requirementId;
            }
          }
        });
      }
      
      (res.controls || []).forEach((c) => {
        all.push(c);
        (c.requirementIds || []).forEach((reqId) => {
          const reqIdStr = String(reqId);
          // Try to find the matching requirementId
          const matchingReqId = reqIdMap[reqIdStr] || reqIdStr;
          if (!map[matchingReqId]) map[matchingReqId] = [];
          map[matchingReqId].push(c);
          
          // Also index by the original ID in case it doesn't match
          if (!map[reqIdStr]) map[reqIdStr] = [];
          if (!map[reqIdStr].some(ctrl => ctrl.controlId === c.controlId)) {
            map[reqIdStr].push(c);
          }
        });
      });
      setControlsByRequirement(map);
      setAllControls(all);
    } catch (error) {
      console.warn('Failed to load controls', error);
    }
  };

  // Calculate statistics
  const stats = {
    totalQuestions: questions.length,
    totalRequirements: allRequirements.length,
    totalControls: allControls.length,
    questionsWithMappings: mappings.filter(m => m.controlBasedRequirements && m.controlBasedRequirements.length > 0).length,
    questionsWithControls: mappings.filter(m => {
      const reqs = m.controlBasedRequirements || [];
      return reqs.some(reqId => (controlsByRequirement[String(reqId)]?.length || 0) > 0);
    }).length,
    requirementsWithControls: allRequirements.filter(r => (r.associatedControlsCount || 0) > 0).length,
    controlsWithRequirements: allControls.filter(c => (c.requirementIds?.length || 0) > 0).length,
  };

  const questionCompletenessRate = stats.totalQuestions > 0 
    ? (stats.questionsWithMappings / stats.totalQuestions) * 100 
    : 0;
  
  const questionControlsCompletenessRate = stats.totalQuestions > 0
    ? (stats.questionsWithControls / stats.totalQuestions) * 100
    : 0;

  const requirementCompletenessRate = stats.totalRequirements > 0
    ? (stats.requirementsWithControls / stats.totalRequirements) * 100
    : 0;

  const controlCompletenessRate = stats.totalControls > 0
    ? (stats.controlsWithRequirements / stats.totalControls) * 100
    : 0;

  // Calculate mapping completeness metrics
  const mappingCompleteness = (() => {
    const questionsWithMappings = mappings.filter(m => m.controlBasedRequirements && m.controlBasedRequirements.length > 0).length;
    const questionsWithEmptyMappings = mappings.filter(m => m.controlBasedRequirements && m.controlBasedRequirements.length === 0).length;
    const questionsWithoutMappings = stats.totalQuestions - mappings.length;
    
    const totalReqs = mappings.reduce((sum, m) => sum + (m.controlBasedRequirements?.length || 0), 0);
    const averageRequirementsPerQuestion = mappings.length > 0 
      ? totalReqs / mappings.length 
      : 0;
    
    const mappingCoverage = stats.totalQuestions > 0
      ? ((questionsWithMappings / stats.totalQuestions) * 100)
      : 0;

    // Find questions needing review (0% mappings)
    const questionsNeedingReview = mappings
      .filter(m => !m.controlBasedRequirements || m.controlBasedRequirements.length === 0)
      .map(m => {
        const question = questions.find(q => q.questionId === m.questionId);
        return {
          questionId: m.questionId,
          text: question?.text || m.questionId,
          reqCount: 0,
        };
      });

    return {
      questionsWithMappings,
      questionsWithoutMappings,
      questionsWithEmptyMappings,
      questionsNeedingReview,
      averageRequirementsPerQuestion,
      mappingCoverage,
    };
  })();

  // Calculate pillar-level mapping completeness
  const pillarCompleteness = (() => {
    // Use the pillars defined at the top of the component
    const pillarStats: Record<string, {
      pillar: string;
      totalQuestions: number;
      questionsWithMappings: number;
      questionsWithEmptyMappings: number;
      questionsWithoutMappings: number;
      questionsNeedingReview: Array<{ questionId: string; text: string }>;
      mappingCoverage: number;
      priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    }> = {};

    // Initialize all pillars
    pillars.forEach(pillar => {
      pillarStats[pillar] = {
        pillar,
        totalQuestions: 0,
        questionsWithMappings: 0,
        questionsWithEmptyMappings: 0,
        questionsWithoutMappings: 0,
        questionsNeedingReview: [],
        mappingCoverage: 0,
        priority: 'LOW',
      };
    });

    // Process all questions by pillar
    questions.forEach(question => {
      const pillar = question.pillar || 'UNKNOWN';
      if (!pillarStats[pillar]) {
        pillarStats[pillar] = {
          pillar,
          totalQuestions: 0,
          questionsWithMappings: 0,
          questionsWithEmptyMappings: 0,
          questionsWithoutMappings: 0,
          questionsNeedingReview: [],
          mappingCoverage: 0,
          priority: 'LOW',
        };
      }

      pillarStats[pillar].totalQuestions++;
      const mapping = mappings.find(m => m.questionId === question.questionId);
      
      if (!mapping) {
        pillarStats[pillar].questionsWithoutMappings++;
        pillarStats[pillar].questionsNeedingReview.push({
          questionId: question.questionId,
          text: question.text || question.questionId,
        });
      } else if (!mapping.controlBasedRequirements || mapping.controlBasedRequirements.length === 0) {
        pillarStats[pillar].questionsWithEmptyMappings++;
        pillarStats[pillar].questionsNeedingReview.push({
          questionId: question.questionId,
          text: question.text || question.questionId,
        });
      } else {
        pillarStats[pillar].questionsWithMappings++;
      }
    });

    // Calculate coverage and priority for each pillar
    Object.values(pillarStats).forEach(stats => {
      stats.mappingCoverage = stats.totalQuestions > 0
        ? (stats.questionsWithMappings / stats.totalQuestions) * 100
        : 0;

      // Determine priority based on gaps
      const totalGaps = stats.questionsWithEmptyMappings + stats.questionsWithoutMappings;
      const gapPercentage = stats.totalQuestions > 0
        ? (totalGaps / stats.totalQuestions) * 100
        : 0;

      if (gapPercentage >= 50 || stats.questionsNeedingReview.length >= 5) {
        stats.priority = 'CRITICAL';
      } else if (gapPercentage >= 30 || stats.questionsNeedingReview.length >= 3) {
        stats.priority = 'HIGH';
      } else if (gapPercentage >= 15 || stats.questionsNeedingReview.length >= 1) {
        stats.priority = 'MEDIUM';
      } else {
        stats.priority = 'LOW';
      }
    });

    return Object.values(pillarStats).sort((a, b) => {
      // Sort by priority (CRITICAL first), then by gap count
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      const aGaps = a.questionsWithEmptyMappings + a.questionsWithoutMappings;
      const bGaps = b.questionsWithEmptyMappings + b.questionsWithoutMappings;
      return bGaps - aGaps;
    });
  })();

  // Find shared items
  const findSharedControls = (reqId: string) => {
    const controls = controlsByRequirement[String(reqId)] || [];
    return controls.filter(c => {
      const reqIds = (c.requirementIds || []).map(String);
      return reqIds.length > 1; // Shared if linked to multiple requirements
    });
  };

  const findSharedRequirements = (questionId: string) => {
    const mapping = mappings.find(m => m.questionId === questionId);
    if (!mapping) return [];
    const reqIds = mapping.controlBasedRequirements || [];
    return reqIds.filter(reqId => {
      const controls = controlsByRequirement[String(reqId)] || [];
      return controls.some(c => {
        const cReqIds = (c.requirementIds || []).map(String);
        return cReqIds.length > 1; // Shared if control links to multiple requirements
      });
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
      onCancel: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const handleEdit = (type: 'question' | 'requirement' | 'control', item: any) => {
    setEditModal({ type, item, isOpen: true });
  };

  const handleSaveEdit = async (formData: any) => {
    setSaving(true);
    try {
      let endpoint = '';
      let method = 'POST';
      
      if (editModal.type === 'question') {
        endpoint = '/questionnaire/questions';
        if (editModal.item?._id || editModal.item?.questionId) method = 'PUT';
        
        // If linkedRequirements is provided, update the mapping
        if (formData.linkedRequirements && formData.linkedRequirements.length > 0 && editModal.item?.questionId) {
      await apiRequest('/rule-version/mappings', {
        method: 'PUT',
        body: JSON.stringify({
              questionId: editModal.item.questionId,
              controlBasedRequirements: formData.linkedRequirements,
        }),
      });
        }
      } else if (editModal.type === 'requirement') {
        endpoint = '/requirements';
        if (editModal.item?.requirementId) method = 'PUT';
        
        // If linkedQuestions is provided, update the mappings
        if (formData.linkedQuestions && formData.linkedQuestions.length > 0 && editModal.item?.requirementId) {
          // Update each question's mapping to include this requirement
          for (const qId of formData.linkedQuestions) {
            const mapping = mappings.find(m => m.questionId === qId);
            const currentReqs = mapping?.controlBasedRequirements || [];
            if (!currentReqs.includes(editModal.item.requirementId)) {
              await apiRequest('/rule-version/mappings', {
                method: 'PUT',
                body: JSON.stringify({
                  questionId: qId,
                  controlBasedRequirements: [...currentReqs, editModal.item.requirementId],
                }),
              });
            }
          }
        }
      } else if (editModal.type === 'control') {
        endpoint = '/controls';
        if (editModal.item?.controlId) method = 'PUT';
      }

      // Remove linkedRequirements/linkedQuestions from formData before saving
      const { linkedRequirements, linkedQuestions, ...dataToSave } = formData;
      await apiRequest(endpoint, {
        method,
        body: JSON.stringify(dataToSave),
      });

      setEditModal({ type: null, item: null, isOpen: false });
      await loadData();
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: 'question' | 'requirement' | 'control', item: any) => {
    showConfirm(
      `Delete ${type}`,
      `Are you sure you want to delete this ${type}? This action cannot be undone.`,
      async () => {
        try {
          let endpoint = '';
          if (type === 'question') {
            endpoint = `/questionnaire/questions?id=${item._id || item.questionId}`;
          } else if (type === 'requirement') {
            endpoint = `/requirements/${item.requirementId}`;
          } else if (type === 'control') {
            endpoint = `/controls/${item.controlId}`;
          }

          await apiRequest(endpoint, { method: 'DELETE' });
          await loadData();
        } catch (error: any) {
          alert(`Failed to delete: ${error.message}`);
        }
      }
    );
  };

  const handleAdd = (type: 'question' | 'requirement' | 'control') => {
    setEditModal({ 
      type, 
      item: type === 'question' 
        ? { questionId: `Q-${Date.now()}`, text: '', type: 'YES_NO', pillar: '', order: questions.length + 1, isRequired: true, options: [] }
        : type === 'requirement'
        ? { requirementId: `Chilean Privacy-REQ-${Date.now()}`, title: '', description: '', legalText: '', pillar: 'LAWFULNESS_FAIRNESS' }
        : { controlId: `CTRL-${Date.now()}`, title: '', description: '', pillar: 'LAWFULNESS_FAIRNESS', controlType: 'TRANSVERSAL', requirementIds: [] },
      isOpen: true 
    });
  };

  const handleDragStart = (e: React.DragEvent, type: string, id: string, questionId?: string) => {
    setDraggedItem({ type, id, questionId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy'; // Default to copy
    if (targetId) {
      setDragOverTarget(targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetQuestionId: string, targetRequirementId?: string, targetControlId?: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedItem) return;

    if (draggedItem.type === 'requirement' && targetQuestionId) {
      // Ask user if they want to copy or move
      const action = window.confirm(
        `Requirement ${draggedItem.id}\n\nClick OK to COPY (keep in original location)\nClick Cancel to MOVE (remove from original location)`
      ) ? 'copy' : 'move';

      const actionText = action === 'copy' ? 'Copy' : 'Move';
      showConfirm(
        `${actionText} Requirement`,
        `${actionText} requirement ${draggedItem.id} to question ${targetQuestionId}?`,
        async () => {
          try {
            const mapping = mappings.find(m => m.questionId === targetQuestionId);
            const currentReqs = mapping?.controlBasedRequirements || [];
            if (!currentReqs.includes(draggedItem.id)) {
              await apiRequest('/rule-version/mappings', {
                method: 'PUT',
                body: JSON.stringify({
                  questionId: targetQuestionId,
                  controlBasedRequirements: [...currentReqs, draggedItem.id],
                }),
              });
              
              // If move, remove from original location
              if (action === 'move' && draggedItem.questionId) {
                const originalMapping = mappings.find(m => m.questionId === draggedItem.questionId);
                if (originalMapping) {
                  const updatedReqs = (originalMapping.controlBasedRequirements || []).filter(r => r !== draggedItem.id);
                  await apiRequest('/rule-version/mappings', {
                    method: 'PUT',
                    body: JSON.stringify({
                      questionId: draggedItem.questionId,
                      controlBasedRequirements: updatedReqs,
                    }),
                  });
                }
              }
              
              await loadData();
            }
          } catch (error: any) {
            alert(`Failed to ${action} requirement: ${error.message}`);
          }
        }
      );
    } else if (draggedItem.type === 'control' && targetRequirementId) {
      // Ask user if they want to copy or move
      const action = window.confirm(
        `Control ${draggedItem.id}\n\nClick OK to COPY (keep in original location)\nClick Cancel to MOVE (remove from original location)`
      ) ? 'copy' : 'move';

      const actionText = action === 'copy' ? 'Copy' : 'Move';
      showConfirm(
        `${actionText} Control`,
        `${actionText} control ${draggedItem.id} to requirement ${targetRequirementId}?`,
        async () => {
          try {
            const control = allControls.find(c => c.controlId === draggedItem.id);
            if (control) {
              const currentReqIds = (control.requirementIds || []).map(String);
              const reqIdStr = String(targetRequirementId);
              
              if (action === 'copy') {
                // Copy: add to target without removing from original
                if (!currentReqIds.includes(reqIdStr)) {
                  await apiRequest('/controls', {
                    method: 'PUT',
                    body: JSON.stringify({
                      controlId: control.controlId,
                      requirementIds: [...currentReqIds, reqIdStr],
                    }),
                  });
                }
              } else {
                // Move: replace all requirementIds with just the target
                await apiRequest('/controls', {
                  method: 'PUT',
                  body: JSON.stringify({
                    controlId: control.controlId,
                    requirementIds: [reqIdStr],
                  }),
                });
              }
              
              await loadData();
            }
          } catch (error: any) {
            alert(`Failed to ${action} control: ${error.message}`);
          }
        }
      );
    } else if (draggedItem.type === 'requirement' && targetControlId) {
      showConfirm(
        'Add Requirement',
        `Copy requirement ${draggedItem.id} to control ${targetControlId}?`,
        async () => {
          try {
            const control = allControls.find(c => c.controlId === targetControlId);
            if (control) {
              const currentReqIds = (control.requirementIds || []).map(String);
              const reqIdStr = String(draggedItem.id);
              if (!currentReqIds.includes(reqIdStr)) {
                await apiRequest('/controls', {
                  method: 'PUT',
                  body: JSON.stringify({
                    controlId: control.controlId,
                    requirementIds: [...currentReqIds, reqIdStr],
                  }),
                });
                await loadData();
              }
            }
          } catch (error: any) {
            alert(`Failed to add requirement: ${error.message}`);
          }
        }
      );
    }
    setDraggedItem(null);
  };

  const handleDeleteControl = async (controlId: string, requirementId: string) => {
    showConfirm(
      'Remove Control',
      `Remove control ${controlId} from requirement ${requirementId}?`,
      async () => {
        try {
          const control = allControls.find(c => c.controlId === controlId);
        if (control) {
            const currentReqIds = (control.requirementIds || []).map(String);
            const updatedReqIds = currentReqIds.filter(id => id !== String(requirementId));
            await apiRequest('/controls', {
              method: 'PUT',
              body: JSON.stringify({
                controlId: control.controlId,
                requirementIds: updatedReqIds,
              }),
            });
            await loadData();
          }
        } catch (error: any) {
          alert(`Failed to remove control: ${error.message}`);
        }
      }
    );
  };

  const handleRemoveRequirementFromQuestion = async (questionId: string, requirementId: string) => {
    const req = requirements[requirementId];
    const controls = controlsByRequirement[String(requirementId)] || [];
    const controlsCount = controls.length;
    
    showConfirm(
      'Remove Requirement',
      `Remove requirement ${requirementId}${req?.title ? ` (${req.title})` : ''} from this question?${controlsCount > 0 ? `\n\nThis will also remove ${controlsCount} associated control(s).` : ''}`,
      async () => {
        try {
          const mapping = mappings.find(m => m.questionId === questionId);
          if (mapping) {
            const currentReqs = (mapping.controlBasedRequirements || []).filter(r => r !== requirementId);
            await apiRequest('/rule-version/mappings', {
              method: 'PUT',
              body: JSON.stringify({
                questionId: mapping.questionId,
                controlBasedRequirements: currentReqs,
              }),
            });
            
            // Also remove controls from the requirement if needed
            if (controlsCount > 0) {
              for (const control of controls) {
                const currentReqIds = (control.requirementIds || []).map(String);
                const updatedReqIds = currentReqIds.filter(id => id !== String(requirementId));
                await apiRequest('/controls', {
                  method: 'PUT',
                  body: JSON.stringify({
                    controlId: control.controlId,
                    requirementIds: updatedReqIds,
                  }),
                });
              }
            }
            
            await loadData();
          }
        } catch (error: any) {
          alert(`Failed to remove requirement: ${error.message}`);
        }
      }
    );
  };

  const handleAddRequirementToQuestion = async (questionId: string) => {
    const availableReqs = allRequirements.filter(r => {
      const mapping = mappings.find(m => m.questionId === questionId);
      const currentReqs = mapping?.controlBasedRequirements || [];
      return !currentReqs.includes(r.requirementId);
    });
    
    if (availableReqs.length === 0) {
      alert('No available requirements to add. All requirements are already linked to this question.');
      return;
    }
    
    const reqList = availableReqs.map(r => `${r.requirementId} - ${r.title || r.name || ''}`).join('\n');
    const reqId = prompt(`Enter requirement ID to add to question ${questionId}:\n\nAvailable requirements:\n${reqList}`);
    
    if (reqId) {
      const req = allRequirements.find(r => r.requirementId === reqId.trim());
      if (req) {
        showConfirm(
          'Add Requirement',
          `Add requirement ${req.requirementId}${req.title ? ` (${req.title})` : ''} to question ${questionId}?`,
          async () => {
            try {
              const mapping = mappings.find(m => m.questionId === questionId);
              if (mapping) {
                const currentReqs = mapping.controlBasedRequirements || [];
                if (!currentReqs.includes(req.requirementId)) {
                  await apiRequest('/rule-version/mappings', {
                    method: 'PUT',
                    body: JSON.stringify({
                      questionId: mapping.questionId,
                      controlBasedRequirements: [...currentReqs, req.requirementId],
                    }),
                  });
                  await loadData();
                }
              }
            } catch (error: any) {
              alert(`Failed to add requirement: ${error.message}`);
            }
          }
        );
      } else {
        alert('Requirement not found. Please check the requirement ID.');
      }
    }
  };

  const handleExportExcel = () => {
    try {
      // Prepare data for export
      const exportData: any[] = [];

      // Export Requirements with all linkages
      allRequirements.forEach((req: any) => {
        const linkedQuestions = requirementToQuestions[req.requirementId] || [];
        const linkedControls = controlsByRequirement[req.requirementId] || [];
        
        exportData.push({
          Type: 'Requirement',
          ID: req.requirementId,
          Title: req.title || req.name || '',
          Description: req.description || '',
          'Legal Text': req.legalText || '',
          Pillar: req.pillar || '',
          Article: req.article || '',
          Chapter: req.chapter || '',
          'Linked Questions': linkedQuestions.join('; '),
          'Linked Controls': linkedControls.map(c => c.controlId).join('; '),
        });
      });

      // Export Questions with linkages
      questions.forEach(q => {
        const mapping = mappings.find(m => m.questionId === q.questionId);
        const linkedReqs = mapping?.controlBasedRequirements || [];
        const linkedControls = new Set<string>();
        linkedReqs.forEach(reqId => {
          (controlsByRequirement[String(reqId)] || []).forEach(c => linkedControls.add(c.controlId));
        });
        
        exportData.push({
          Type: 'Question',
          ID: q.questionId,
          Text: q.text || '',
          Pillar: q.pillar || '',
          'Question Type': q.type || '',
          Order: q.order || '',
          Required: q.isRequired ? 'Yes' : 'No',
          'Linked Requirements': linkedReqs.join('; '),
          'Linked Controls': Array.from(linkedControls).join('; '),
        });
      });

      // Export Controls with linkages
      allControls.forEach(ctrl => {
        const linkedReqs = (ctrl.requirementIds || []).map(String);
        const linkedQuestions = new Set<string>();
        linkedReqs.forEach(reqId => {
          (requirementToQuestions[reqId] || []).forEach(qId => linkedQuestions.add(qId));
        });
        
        exportData.push({
          Type: 'Control',
          ID: ctrl.controlId,
          Title: ctrl.title || ctrl.name || '',
          Description: ctrl.description || '',
          Pillar: ctrl.pillar || '',
          'Control Type': ctrl.controlType || '',
          'Linked Requirements': linkedReqs.join('; '),
          'Linked Questions': Array.from(linkedQuestions).join('; '),
        });
      });

      // Create workbook and export
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rule Engine Data');
      XLSX.writeFile(wb, `rule-engine-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      alert(`Exported ${exportData.length} items to Excel`);
    } catch (error: any) {
      alert(`Failed to export: ${error.message}`);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      showConfirm(
        'Import Excel',
        `Import ${jsonData.length} items from Excel? This will update existing items and create new ones.`,
        async () => {
          try {
            for (const row of jsonData as any[]) {
              if (row.Type === 'Requirement') {
                // Update requirement
                await apiRequest('/requirements', {
                  method: 'PUT',
                  body: JSON.stringify({
                    requirementId: row.ID,
                    title: row.Title || '',
                    description: row.Description || '',
                    legalText: row['Legal Text'] || '',
                    pillar: row.Pillar || '',
                    article: row.Article || '',
                    chapter: row.Chapter || '',
                  }),
                });

                // Update question linkages
                if (row['Linked Questions']) {
                  const questionIds = (row['Linked Questions'] as string).split(';').map(s => s.trim()).filter(Boolean);
                  for (const qId of questionIds) {
                    const mapping = mappings.find(m => m.questionId === qId);
                    const currentReqs = mapping?.controlBasedRequirements || [];
                    if (!currentReqs.includes(row.ID)) {
                      await apiRequest('/rule-version/mappings', {
                        method: 'PUT',
                        body: JSON.stringify({
                          questionId: qId,
                          controlBasedRequirements: [...currentReqs, row.ID],
                        }),
                      });
                    }
                  }
                }

                // Update control linkages
                if (row['Linked Controls']) {
                  const controlIds = (row['Linked Controls'] as string).split(';').map(s => s.trim()).filter(Boolean);
                  for (const ctrlId of controlIds) {
                    const control = allControls.find(c => c.controlId === ctrlId);
                    if (control) {
                      const currentReqIds = (control.requirementIds || []).map(String);
                      if (!currentReqIds.includes(row.ID)) {
                        await apiRequest('/controls', {
                          method: 'PUT',
                          body: JSON.stringify({
                            controlId: ctrlId,
                            requirementIds: [...currentReqIds, row.ID],
                          }),
                        });
                      }
                    }
                  }
                }
              } else if (row.Type === 'Question') {
                // Update question
                await apiRequest('/questionnaire/questions', {
                  method: 'PUT',
                  body: JSON.stringify({
                    questionId: row.ID,
                    text: row.Text || '',
                    pillar: row.Pillar || '',
                    type: row['Question Type'] || 'YES_NO',
                    order: row.Order || 0,
                    isRequired: row.Required === 'Yes',
                  }),
                });

                // Update requirement linkages
                if (row['Linked Requirements']) {
                  const reqIds = (row['Linked Requirements'] as string).split(';').map(s => s.trim()).filter(Boolean);
                  await apiRequest('/rule-version/mappings', {
                    method: 'PUT',
                    body: JSON.stringify({
                      questionId: row.ID,
                      controlBasedRequirements: reqIds,
                    }),
                  });
                }
              } else if (row.Type === 'Control') {
                // Update control
                await apiRequest('/controls', {
                  method: 'PUT',
                  body: JSON.stringify({
                    controlId: row.ID,
                    title: row.Title || '',
                    description: row.Description || '',
                    pillar: row.Pillar || '',
                    controlType: row['Control Type'] || 'TRANSVERSAL',
                  }),
                });

                // Update requirement linkages
                if (row['Linked Requirements']) {
                  const reqIds = (row['Linked Requirements'] as string).split(';').map(s => s.trim()).filter(Boolean);
                  await apiRequest('/controls', {
                    method: 'PUT',
                    body: JSON.stringify({
                      controlId: row.ID,
                      requirementIds: reqIds,
                    }),
                  });
                }
              }
            }

            await loadData();
            alert('Import completed successfully!');
          } catch (error: any) {
            alert(`Failed to import: ${error.message}`);
          }
        }
      );
    } catch (error: any) {
      alert(`Failed to read file: ${error.message}`);
    }
    
    // Reset input
    e.target.value = '';
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  // Show requirements and controls even if mappings are empty
  // Only show the "no mappings" message if there are also no requirements
  if (mappings.length === 0 && allRequirements.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/chile-privacy/dashboard" className="text-2xl font-bold text-blue-600">
                  Nexus Privacy
                </Link>
                <Link href="/chile-privacy/dashboard/rule-engine" className="text-gray-700 hover:text-blue-600">
                  Rule Engine
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Rule Engine Mappings</h1>
            <p className="text-gray-600 mb-6">
              No mappings have been precomputed yet. Run: <code className="bg-gray-100 px-2 py-1 rounded">npm run precompute:mappings:privacy</code>
            </p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={loadData}
            >
              Refresh Data
            </button>
          </div>
        </main>
      </div>
    );
  }

  const questionsById = questions.reduce<Record<string, Question>>((acc, q) => {
    acc[q.questionId] = q;
    return acc;
  }, {});

  // Build reverse mappings: requirement -> questions, control -> requirements
  // Note: `pillars` is already defined at the top of the component
  const requirementToQuestions: Record<string, string[]> = {};
  mappings.forEach(m => {
    (m.controlBasedRequirements || []).forEach(reqId => {
      if (!requirementToQuestions[reqId]) requirementToQuestions[reqId] = [];
      if (!requirementToQuestions[reqId].includes(m.questionId)) {
        requirementToQuestions[reqId].push(m.questionId);
      }
    });
  });

  const controlToRequirements: Record<string, string[]> = {};
  allControls.forEach(control => {
    (control.requirementIds || []).forEach(reqId => {
      const reqIdStr = String(reqId);
      if (!controlToRequirements[control.controlId]) controlToRequirements[control.controlId] = [];
      if (!controlToRequirements[control.controlId].includes(reqIdStr)) {
        controlToRequirements[control.controlId].push(reqIdStr);
      }
    });
  });
  
  const itemsToGroup = organizeBy === 'questions' 
    ? [
        // Questions with mappings
        ...mappings.map(m => ({ mapping: m, question: questionsById[m.questionId] })),
        // Questions without mappings (show them too)
        ...questions
          .filter(q => !mappings.some(m => m.questionId === q.questionId))
          .map(q => ({ mapping: { questionId: q.questionId, controlBasedRequirements: [] }, question: q }))
      ]
    : organizeBy === 'requirements'
    ? allRequirements.map(req => ({ 
        requirement: req,
        questions: requirementToQuestions[req.requirementId] || [],
        controls: controlsByRequirement[req.requirementId] || []
      }))
    : allControls.map(ctrl => ({
        control: ctrl,
        requirements: controlToRequirements[ctrl.controlId] || [],
        questions: (() => {
          const reqIds = controlToRequirements[ctrl.controlId] || [];
          const questionIds = new Set<string>();
          reqIds.forEach(reqId => {
            (requirementToQuestions[reqId] || []).forEach(qId => questionIds.add(qId));
          });
          return Array.from(questionIds);
        })()
      }));
  
  const groupedByPillar: Record<string, any[]> = {};
  itemsToGroup.forEach((item: any) => {
    const pillar = organizeBy === 'questions' 
      ? (item.question?.pillar || 'UNKNOWN')
      : organizeBy === 'requirements'
      ? (item.requirement?.pillar || 'UNKNOWN')
      : (item.control?.pillar || 'UNKNOWN');
    if (!groupedByPillar[pillar]) groupedByPillar[pillar] = [];
    groupedByPillar[pillar].push(item);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/chile-privacy/dashboard" className="text-2xl font-bold text-blue-600">
                  Nexus Privacy
                </Link>
                <Link href="/chile-privacy/dashboard/rule-engine" className="text-gray-700 hover:text-blue-600">
                  Rule Engine
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <LanguageToggle />
              </div>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Dashboard */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Questions</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalQuestions}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Requirements</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalRequirements}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Controls</div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalControls}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Question Completeness</div>
              <div className="text-2xl font-bold text-yellow-600">{questionCompletenessRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">{stats.questionsWithMappings}/{stats.totalQuestions} with reqs</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Questions with Controls</div>
              <div className="text-2xl font-bold text-orange-600">{questionControlsCompletenessRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">{stats.questionsWithControls}/{stats.totalQuestions}</div>
            </div>
            <div className="bg-teal-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Requirements with Controls</div>
              <div className="text-2xl font-bold text-teal-600">{requirementCompletenessRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">{stats.requirementsWithControls}/{stats.totalRequirements}</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Controls with Requirements</div>
              <div className="text-2xl font-bold text-indigo-600">{controlCompletenessRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">{stats.controlsWithRequirements}/{stats.totalControls}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Gaps</div>
              <div className="text-2xl font-bold text-red-600">{stats.totalQuestions - stats.questionsWithMappings}</div>
              <div className="text-xs text-gray-500">Questions without mappings</div>
            </div>
          </div>
        </div>

        {/* Mapping Completeness Dashboard */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Mapping Completeness</h2>
          <p className="text-sm text-gray-600 mb-4">
            Shows the completeness of question-to-requirement mappings. Questions with 0% mappings need expert review.
          </p>
          
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <div className="text-sm text-gray-600">Questions with Mappings</div>
              <div className="text-2xl font-bold text-green-600">
                {mappingCompleteness.questionsWithMappings}
              </div>
              <div className="text-xs text-gray-500">
                {mappingCompleteness.mappingCoverage.toFixed(1)}% coverage
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
              <div className="text-sm text-gray-600">Empty Mappings (0%)</div>
              <div className="text-2xl font-bold text-yellow-600">
                {mappingCompleteness.questionsWithEmptyMappings}
              </div>
              <div className="text-xs text-gray-500">Needs expert review</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
              <div className="text-sm text-gray-600">No Mappings</div>
              <div className="text-2xl font-bold text-red-600">
                {mappingCompleteness.questionsWithoutMappings}
              </div>
              <div className="text-xs text-gray-500">Not precomputed</div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Avg Reqs/Question</div>
              <div className="text-2xl font-bold text-blue-600">
                {mappingCompleteness.averageRequirementsPerQuestion.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">Per mapped question</div>
            </div>
          </div>
          
          {/* Questions Needing Review */}
          {mappingCompleteness.questionsNeedingReview.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-2 text-yellow-700">
                ⚠️ Questions Needing Expert Review ({mappingCompleteness.questionsNeedingReview.length})
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                These questions have 0% requirement mappings. Expert curation is needed to bridge the gap.
              </p>
              <div className="bg-yellow-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {mappingCompleteness.questionsNeedingReview.slice(0, 10).map((q) => (
                    <li key={q.questionId} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="font-medium text-gray-900 min-w-[120px]">{q.questionId}:</span>
                      <span className="flex-1">{q.text.substring(0, 100)}{q.text.length > 100 ? '...' : ''}</span>
                    </li>
                  ))}
                </ul>
                {mappingCompleteness.questionsNeedingReview.length > 10 && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    ... and {mappingCompleteness.questionsNeedingReview.length - 10} more question(s) need review
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pillar-Level Breakdown */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Pillar-Level Mapping Completeness</h2>
          <p className="text-sm text-gray-600 mb-4">
            Focus on pillars with CRITICAL or HIGH priority to improve mapping quality. Questions with 0 requirements can't link to controls.
          </p>
          
          <div className="space-y-4">
            {pillarCompleteness.map((pillarStats) => {
              const pillarLabel = pillarStats.pillar.replace(/_/g, ' ');
              const totalGaps = pillarStats.questionsWithEmptyMappings + pillarStats.questionsWithoutMappings;
              const priorityColors = {
                CRITICAL: 'bg-red-50 border-red-500',
                HIGH: 'bg-orange-50 border-orange-500',
                MEDIUM: 'bg-yellow-50 border-yellow-500',
                LOW: 'bg-green-50 border-green-500',
              };
              const priorityTextColors = {
                CRITICAL: 'text-red-700',
                HIGH: 'text-orange-700',
                MEDIUM: 'text-yellow-700',
                LOW: 'text-green-700',
              };

              return (
                <div
                  key={pillarStats.pillar}
                  className={`border-l-4 rounded-lg p-4 ${priorityColors[pillarStats.priority]}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{pillarLabel}</h3>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${priorityTextColors[pillarStats.priority]}`}>
                          {pillarStats.priority}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Total Questions:</span>
                          <span className="ml-2 font-semibold">{pillarStats.totalQuestions}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">With Mappings:</span>
                          <span className="ml-2 font-semibold text-green-600">{pillarStats.questionsWithMappings}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Empty (0%):</span>
                          <span className="ml-2 font-semibold text-yellow-600">{pillarStats.questionsWithEmptyMappings}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">No Mappings:</span>
                          <span className="ml-2 font-semibold text-red-600">{pillarStats.questionsWithoutMappings}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {pillarStats.mappingCoverage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Coverage</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          pillarStats.mappingCoverage >= 80
                            ? 'bg-green-600'
                            : pillarStats.mappingCoverage >= 50
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${pillarStats.mappingCoverage}%` }}
                      />
                    </div>
                  </div>

                  {/* Questions Needing Review */}
                  {pillarStats.questionsNeedingReview.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        ⚠️ {pillarStats.questionsNeedingReview.length} question(s) need expert review:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pillarStats.questionsNeedingReview.slice(0, 5).map((q) => (
                          <span
                            key={q.questionId}
                            className="inline-block px-2 py-1 bg-white rounded text-xs text-gray-700 border border-gray-300"
                            title={q.text}
                          >
                            {q.questionId}
                          </span>
                        ))}
                        {pillarStats.questionsNeedingReview.length > 5 && (
                          <span className="inline-block px-2 py-1 text-xs text-gray-500">
                            +{pillarStats.questionsNeedingReview.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Rule Engine Mappings</h1>
            {ruleVersion && (
              <p className="text-sm text-gray-600">Rule Version: v{ruleVersion.version}</p>
            )}
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-semibold">Current View:</span> {
                organizeBy === 'questions' ? '📝 Questions → Requirements → Controls' :
                organizeBy === 'requirements' ? '📋 Requirements → Questions & Controls' :
                '🛡️ Controls → Requirements → Questions'
              }
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
              <span className="text-xs text-gray-600 mr-2 font-semibold">Organize by:</span>
              <button
                className={`px-3 py-1 text-sm rounded font-medium ${organizeBy === 'questions' ? 'bg-white shadow border-2 border-blue-500' : 'text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setOrganizeBy('questions')}
                title="View: Questions → Requirements → Controls"
              >
                📝 Questions ({stats.totalQuestions})
              </button>
              <button
                className={`px-3 py-1 text-sm rounded font-medium ${organizeBy === 'requirements' ? 'bg-white shadow border-2 border-green-500' : 'text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setOrganizeBy('requirements')}
                title="View: Requirements → Questions & Controls (Shows ALL {stats.totalRequirements} requirements)"
              >
                📋 Requirements ({stats.totalRequirements})
              </button>
              <button
                className={`px-3 py-1 text-sm rounded font-medium ${organizeBy === 'controls' ? 'bg-white shadow border-2 border-purple-500' : 'text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setOrganizeBy('controls')}
                title="View: Controls → Requirements → Questions"
              >
                🛡️ Controls ({stats.totalControls})
              </button>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
              <button
                className={`px-3 py-1 text-sm rounded ${viewMode === 'table' || organizeBy === 'questions' ? 'bg-white shadow' : 'text-gray-600'}`}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
              <button
                className={`px-3 py-1 text-sm rounded ${viewMode === 'tree' && organizeBy !== 'questions' ? 'bg-white shadow' : 'text-gray-600'} ${organizeBy === 'questions' ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (organizeBy !== 'questions') {
                    setViewMode('tree');
                  }
                }}
                disabled={organizeBy === 'questions'}
                title={organizeBy === 'questions' ? 'Tree view not available for questions' : 'Tree view'}
              >
                Tree
              </button>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              onClick={handleExportExcel}
              disabled={loading}
            >
              Export Excel
            </button>
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {(viewMode === 'table' || organizeBy === 'questions') ? (
          <div className="space-y-6">
            {Object.keys(groupedByPillar).sort((a, b) => {
              // Sort: known pillars first, then UNKNOWN
              if (a === 'UNKNOWN') return 1;
              if (b === 'UNKNOWN') return -1;
              const aIdx = pillars.indexOf(a);
              const bIdx = pillars.indexOf(b);
              if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
              if (aIdx === -1) return 1;
              if (bIdx === -1) return -1;
              return aIdx - bIdx;
            }).map(pillar => {
              const pillarItems = groupedByPillar[pillar] || [];
              if (pillarItems.length === 0) return null;
              
              return (
                <div key={pillar} className="bg-white shadow rounded-lg overflow-x-auto">
                  <div className="bg-gray-100 px-4 py-2 border-b">
                    <h3 className="font-semibold text-gray-800">{pillar.replace(/_/g, ' ')}</h3>
                  </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {organizeBy === 'questions' && (
                    <>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" colSpan={2}>Requirements & Controls</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </>
                  )}
                  {organizeBy === 'requirements' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requirement ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requirement Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question Text</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Controls</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completeness</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </>
                  )}
                  {organizeBy === 'controls' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" colSpan={2}>Requirements</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Questions</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completeness</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                      {organizeBy === 'questions' ? pillarItems.map(({ mapping: m, question: q }) => {
                  const reqs = m?.controlBasedRequirements || [];
                        const totalControls = reqs.reduce((sum: number, reqId: any) => {
                          return sum + (controlsByRequirement[String(reqId)]?.length || 0);
                        }, 0);
                        
                  return (
                          <tr key={m?.questionId || q?.questionId} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-mono text-xs text-gray-600 mb-1">{m?.questionId || q?.questionId || '—'}</div>
                              <div className="text-sm text-gray-800 font-medium">{q?.text || '—'}</div>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleEdit('question', q)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                  title="Edit question"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="text-xs text-red-600 hover:text-red-800"
                                  onClick={() => handleDelete('question', q)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                      </td>
                            <td className="px-4 py-3" colSpan={2}>
                              <div className="mb-2">
                                <button
                                  onClick={() => handleAddRequirementToQuestion(m?.questionId || q?.questionId)}
                                  className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                  title="Add requirement to this question"
                                >
                                  + Add Requirement
                                </button>
                              </div>
                              {reqs.length > 0 ? (
                                <div className="space-y-3">
                                  {reqs.map((reqId: any) => {
                                    const req = requirements[reqId];
                                    const controls = controlsByRequirement[String(reqId)] || [];
                                    if (!req) return null; // Skip if requirement not found
                                  return (
                                      <div 
                                        key={reqId} 
                                        className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3 cursor-move"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'requirement', reqId, m.questionId)}
                                      >
                                        {/* Requirement Level */}
                                        <div className="mb-2">
                                          <div className="group relative">
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                              <p className="text-xs font-mono text-gray-600">{reqId}</p>
                                              <span className="text-xs font-semibold text-gray-800">{req?.title || req?.name || '—'}</span>
                                              {req?.description && (
                                                <span className="text-gray-400 cursor-help text-xs">ℹ️</span>
                                              )}
                                              <button
                                                onClick={() => handleEdit('requirement', req)}
                                                className="text-blue-600 hover:text-blue-800 text-xs"
                                                title="Edit requirement"
                                              >
                                                ✏️
                                              </button>
                                              <button
                                                onClick={() => handleRemoveRequirementFromQuestion(m.questionId, reqId)}
                                                className="text-red-600 hover:text-red-800 text-xs"
                                                title="Remove requirement from question (will also remove associated controls)"
                                              >
                                                🗑️
                                              </button>
                                            </div>
                                            {req?.description && (
                                              <>
                                                <div className="text-xs text-gray-500 line-clamp-2 mb-1 ml-4">{req.description}</div>
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-96 p-3 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                                  <div className="font-semibold mb-1">{req?.title || req?.name || reqId}</div>
                                                  <div>{req.description}</div>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Controls Level - Directly linked to this requirement */}
                                        <div className="ml-4 border-l-2 border-purple-300 pl-3 mt-2">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                              <span className="text-xs font-semibold text-purple-700">Controls ({controls.length})</span>
                                            </div>
                                            <button
                                              onClick={() => setAddControlModal({ isOpen: true, requirementId: reqId, questionId: m.questionId })}
                                              className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                              title="Add control to this requirement"
                                            >
                                              + Add Control
                                            </button>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {controls.length > 0 ? controls.map((c) => (
                                              <span
                                                key={c.controlId}
                                                className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-mono flex items-center gap-1 group relative"
                                                title={`${c.controlId} - ${c.title || c.name || ''}`}
                                              >
                                                {c.controlId}
                                                {(c.title || c.name || c.description) && (
                                                  <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                                    <div className="font-semibold mb-1">{c.title || c.name || c.controlId}</div>
                                                    {c.description && <div>{c.description}</div>}
                                                  </span>
                                                )}
                                                <button
                                                  onClick={() => handleEdit('control', c)}
                                                  className="text-purple-600 hover:text-purple-800"
                                                  title="Edit control"
                                                >
                                                  ✏️
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteControl(c.controlId, reqId)}
                                                  className="text-red-600 hover:text-red-800"
                                                  title="Remove control"
                                                >
                                                  🗑️
                                                </button>
                                              </span>
                                            )) : (
                                              <span className="text-xs text-gray-500 italic">No controls yet</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-red-600 text-xs">No requirements — click "Add Requirement" or drag requirements here</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="text-xs text-gray-500">
                                <div>Reqs: {reqs.length}</div>
                                <div>Controls: {totalControls}</div>
                            </div>
                            </td>
                          </tr>
                        );
                      }) : organizeBy === 'requirements' ? pillarItems.map(({ requirement: req, questions: questionIds, controls }) => {
                        return (
                          <tr key={req.requirementId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-sm text-gray-800">
                              {req.requirementId}
                              <button
                                onClick={() => handleEdit('requirement', req)}
                                className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                                title="Edit requirement"
                              >
                                ✏️
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="font-semibold">{req?.title || req?.name || '—'}</div>
                              {req?.description && (
                                <div className="text-gray-500 text-xs mt-1 truncate max-w-xs" title={req.description}>
                                  {req.description.substring(0, 100)}...
                              </div>
                            )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                          <div className="space-y-2">
                                {questionIds.length > 0 ? (
                                  questionIds.map((qId: any) => {
                                    const q = questionsById[qId];
                                  return (
                                      <div key={qId} className="flex items-center gap-2">
                                        <div className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                                          {qId}
                          </div>
                                        <button
                                          onClick={() => handleEdit('question', q)}
                                          className="text-blue-600 hover:text-blue-800 text-xs"
                                          title="Edit question"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => {
                                            showConfirm(
                                              'Remove Question',
                                              `Remove question ${qId} from requirement ${req.requirementId}?`,
                                              async () => {
                                                try {
                                                  const mapping = mappings.find(m => m.questionId === qId);
                                                  if (mapping) {
                                                    const currentReqs = mapping.controlBasedRequirements || [];
                                                    const updatedReqs = currentReqs.filter(r => r !== req.requirementId);
                                                    await apiRequest('/rule-version/mappings', {
                                                      method: 'PUT',
                                                      body: JSON.stringify({
                                                        questionId: qId,
                                                        controlBasedRequirements: updatedReqs,
                                                      }),
                                                    });
                                                    await loadData();
                                                  }
                                                } catch (error: any) {
                                                  alert(`Failed to remove question: ${error.message}`);
                                                }
                                              }
                                            );
                                          }}
                                          className="text-red-600 hover:text-red-800 text-xs"
                                          title="Remove question"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                  );
                                })
                              ) : (
                                  <span className="text-red-600 text-xs">No questions</span>
                                )}
                                <button
                                  onClick={() => {
                                    const availableQuestions = questions.filter(q => !questionIds.includes(q.questionId));
                                    if (availableQuestions.length === 0) {
                                      alert('All questions are already linked to this requirement');
                                      return;
                                    }
                                    const questionId = prompt(`Enter question ID to link:\nAvailable: ${availableQuestions.map(q => q.questionId).join(', ')}`);
                                    if (questionId) {
                                      const q = questions.find(q => q.questionId === questionId.trim());
                                      if (q) {
                                        showConfirm(
                                          'Link Question',
                                          `Link question ${questionId} to requirement ${req.requirementId}?`,
                                          async () => {
                                            try {
                                              const mapping = mappings.find(m => m.questionId === questionId.trim());
                                              const currentReqs = mapping?.controlBasedRequirements || [];
                                              if (!currentReqs.includes(req.requirementId)) {
                                                await apiRequest('/rule-version/mappings', {
                                                  method: 'PUT',
                                                  body: JSON.stringify({
                                                    questionId: questionId.trim(),
                                                    controlBasedRequirements: [...currentReqs, req.requirementId],
                                                  }),
                                                });
                                                await loadData();
                                              }
                                            } catch (error: any) {
                                              alert(`Failed to link question: ${error.message}`);
                                            }
                                          }
                                        );
                                      } else {
                                        alert('Question not found');
                                      }
                                    }
                                  }}
                                  className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                  title="Add question to this requirement"
                                >
                                  + Add Question
                                </button>
                            </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                              {questionIds.length > 0 ? (
                                <div className="space-y-1">
                                  {questionIds.map((qId: any) => {
                                    const q = questionsById[qId];
                                    return (
                                      <div key={qId} className="text-xs">
                                        {q?.text || '—'}
                              </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {controls.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {controls.map((c: any) => (
                                    <span
                                      key={c.controlId}
                                      className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-mono flex items-center gap-1 group relative"
                                      title={c.description || c.title || c.name}
                                    >
                                      {c.controlId}
                                      {c.description && (
                                        <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                          {c.description}
                                        </span>
                                      )}
                            <button
                                        onClick={() => handleEdit('control', c)}
                                        className="text-purple-600 hover:text-purple-800"
                                        title="Edit control"
                                      >
                                        ✏️
                            </button>
                            <button
                                        onClick={() => handleDeleteControl(c.controlId, req.requirementId)}
                                        className="text-red-600 hover:text-red-800"
                                        title="Remove control"
                                      >
                                        🗑️
                            </button>
                                    </span>
                                  ))}
                          </div>
                        ) : (
                          <button
                                  onClick={() => setAddControlModal({ isOpen: true, requirementId: req.requirementId })}
                                  className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                >
                                  + Add Control
                                </button>
                        )}
                      </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="text-xs">
                                <div>Questions: {questionIds.length}</div>
                                <div>Controls: {controls.length}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                  onClick={() => {
                                    setEditModal({ type: 'requirement', item: req, isOpen: true });
                                  }}
                          >
                            Edit
                            </button>
                            <button
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                                  onClick={() => handleDelete('requirement', req)}
                            >
                                  Delete
                            </button>
                          </div>
                            </td>
                          </tr>
                        );
                      }) : pillarItems.map(({ control: ctrl, requirements: reqIds, questions: questionIds }) => {
                        return (
                          <tr key={ctrl.controlId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-sm text-gray-800">
                              {ctrl.controlId}
                              <button
                                onClick={() => handleEdit('control', ctrl)}
                                className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                                title="Edit control"
                              >
                                ✏️
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="font-semibold group relative">
                                {ctrl?.title || ctrl?.name || '—'}
                                {ctrl?.description && (
                                  <span className="ml-1 text-gray-400 cursor-help" title={ctrl.description}>
                                    ℹ️
                                  </span>
                                )}
                                {ctrl?.description && (
                                  <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                    {ctrl.description}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm" colSpan={2}>
                              <div className="mb-2">
                                <button
                                  onClick={() => {
                                    const availableReqs = allRequirements.filter(r => !reqIds.includes(r.requirementId));
                                    if (availableReqs.length === 0) {
                                      alert('All requirements are already linked to this control');
                                      return;
                                    }
                                    const reqList = availableReqs.map(r => `${r.requirementId} - ${r.title || r.name || ''}`).join('\n');
                                    const reqId = prompt(`Enter requirement ID to link to control ${ctrl.controlId}:\n\nAvailable requirements:\n${reqList}`);
                                    if (reqId) {
                                      const req = allRequirements.find(r => r.requirementId === reqId.trim());
                                      if (req) {
                                        showConfirm(
                                          'Link Requirement',
                                          `Link requirement ${req.requirementId}${req.title ? ` (${req.title})` : ''} to control ${ctrl.controlId}?`,
                                          async () => {
                                            try {
                                              const control = allControls.find(c => c.controlId === ctrl.controlId);
                                              if (control) {
                                                const currentReqIds = (control.requirementIds || []).map(String);
                                                const reqIdStr = String(req.requirementId);
                                                if (!currentReqIds.includes(reqIdStr)) {
                                                  await apiRequest('/controls', {
                                                    method: 'PUT',
                                                    body: JSON.stringify({
                                                      controlId: control.controlId,
                                                      requirementIds: [...currentReqIds, reqIdStr],
                                                    }),
                                                  });
                                                  await loadData();
                                                }
                                              }
                                            } catch (error: any) {
                                              alert(`Failed to link requirement: ${error.message}`);
                                            }
                                          }
                                        );
                                      } else {
                                        alert('Requirement not found. Please check the requirement ID.');
                                      }
                                    }
                                  }}
                                  className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded hover:bg-green-100"
                                  title="Add requirement to this control"
                                >
                                  + Add Requirement
                                </button>
                              </div>
                              {reqIds.length > 0 ? (
                                <div className="space-y-2">
                                  {reqIds.map((reqId: any) => {
                                    const req = requirements[reqId] || allRequirements.find((r: any) => 
                                      r.requirementId === reqId || 
                                      String(r.requirementId) === String(reqId) ||
                                      String(r._id) === String(reqId)
                                    );
                                    return (
                                      <div key={reqId} className="group relative bg-green-50 rounded p-2 border border-green-200">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="font-mono text-xs bg-green-100 px-2 py-1 rounded group/item relative" title={req?.title || req?.name || reqId}>
                                            {reqId}
                                            {req && (
                                              <span className="absolute bottom-full left-0 mb-2 hidden group-hover/item:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                                <div className="font-semibold mb-1">{req?.title || req?.name || reqId}</div>
                                                {req?.description && <div>{req.description}</div>}
                                              </span>
                                            )}
                                          </div>
                                          {req?.description && (
                                            <span className="text-gray-400 cursor-help text-xs">ℹ️</span>
                                          )}
                                          <button
                                            onClick={() => {
                                              if (req) {
                                                handleEdit('requirement', req);
                                              } else {
                                                alert(`Requirement ${reqId} not found. Cannot edit.`);
                                              }
                                            }}
                                            className="text-green-600 hover:text-green-800 text-xs"
                                            title={req ? "Edit requirement" : "Requirement not found"}
                                            disabled={!req}
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            onClick={() => {
                                              showConfirm(
                                                'Remove Requirement',
                                                `Remove requirement ${reqId}${req?.title ? ` (${req.title})` : ''} from control ${ctrl.controlId}?`,
                                                async () => {
                                                  try {
                                                    const control = allControls.find(c => c.controlId === ctrl.controlId);
                                                    if (control) {
                                                      const currentReqIds = (control.requirementIds || []).map(String);
                                                      const updatedReqIds = currentReqIds.filter(id => id !== String(reqId));
                                                      await apiRequest('/controls', {
                                                        method: 'PUT',
                                                        body: JSON.stringify({
                                                          controlId: control.controlId,
                                                          requirementIds: updatedReqIds,
                                                        }),
                                                      });
                                                      await loadData();
                                                    }
                                                  } catch (error: any) {
                                                    alert(`Failed to remove requirement: ${error.message}`);
                                                  }
                                                }
                                              );
                                            }}
                                            className="text-red-600 hover:text-red-800 text-xs"
                                            title="Remove requirement"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                        {req ? (
                                          <>
                                            <div className="text-xs font-semibold text-gray-800 mb-1">{req?.title || req?.name || '—'}</div>
                                            {req?.description && (
                                              <>
                                                <div className="text-xs text-gray-500 line-clamp-2 max-w-xs mb-1">{req.description}</div>
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-96 p-3 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                                  <div className="font-semibold mb-1">{req?.title || req?.name || reqId}</div>
                                                  <div>{req.description}</div>
                                                </div>
                                              </>
                                            )}
                                          </>
                                        ) : (
                                          <div className="text-xs text-yellow-700 italic">Requirement not found in database</div>
                                        )}
                                      </div>
                                    );
                                  })}
                          </div>
                        ) : (
                                <span className="text-red-600 text-xs">No requirements — click "Add Requirement" to link</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="mb-2">
                          <button
                                  onClick={() => {
                                    // Get questions linked through requirements
                                    const linkedQuestionIds = new Set<string>();
                                    reqIds.forEach((reqId: any) => {
                                      const qIds = requirementToQuestions[reqId] || [];
                                      qIds.forEach((qId: any) => linkedQuestionIds.add(qId));
                                    });
                                    const availableQuestions = questions.filter(q => !linkedQuestionIds.has(q.questionId));
                                    if (availableQuestions.length === 0) {
                                      alert('All questions are already linked to this control through its requirements');
                                      return;
                                    }
                                    const questionId = prompt(`Enter question ID to link:\nAvailable: ${availableQuestions.map(q => q.questionId).slice(0, 10).join(', ')}${availableQuestions.length > 10 ? '...' : ''}`);
                                    if (questionId) {
                                      const q = questions.find(q => q.questionId === questionId.trim());
                                      if (q && reqIds.length > 0) {
                                        // Link to first requirement
                                        const reqId = reqIds[0];
                                        showConfirm(
                                          'Link Question',
                                          `Link question ${questionId} to requirement ${reqId} (linked to control ${ctrl.controlId})?`,
                                          async () => {
                                            try {
                                              const mapping = mappings.find(m => m.questionId === questionId.trim());
                                              if (mapping) {
                                                const currentReqs = mapping.controlBasedRequirements || [];
                                                if (!currentReqs.includes(reqId)) {
                                                  await apiRequest('/rule-version/mappings', {
                                                    method: 'PUT',
                                                    body: JSON.stringify({
                                                      questionId: mapping.questionId,
                                                      controlBasedRequirements: [...currentReqs, reqId],
                                                    }),
                                                  });
                                                  await loadData();
                                                }
                                              }
                                            } catch (error: any) {
                                              alert(`Failed to link question: ${error.message}`);
                                            }
                                          }
                                        );
                                      } else if (!q) {
                                        alert('Question not found');
                                      } else {
                                        alert('No requirements linked to this control. Please link a requirement first.');
                                      }
                                    }
                                  }}
                                  className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                  title="Add question to this control (via requirement)"
                                >
                                  + Add Question
                          </button>
                              </div>
                              {questionIds.length > 0 ? (
                                <div className="space-y-2">
                                  {questionIds.map((qId: any) => {
                                    const q = questionsById[qId];
                                    return (
                                      <div key={qId} className="bg-blue-50 rounded p-2 border border-blue-200">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                                            {qId}
                                          </div>
                                          <button
                                            onClick={() => handleEdit('question', q)}
                                            className="text-blue-600 hover:text-blue-800 text-xs"
                                            title="Edit question"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            onClick={() => {
                                              // Find which requirement links this question
                                              const linkedReqId = reqIds.find((reqId: any) => 
                                                (requirementToQuestions[reqId] || []).includes(qId)
                                              );
                                              if (linkedReqId) {
                                                showConfirm(
                                                  'Remove Question',
                                                  `Remove question ${qId} from requirement ${linkedReqId} (linked to control ${ctrl.controlId})?`,
                                                  async () => {
                                                    try {
                                                      const mapping = mappings.find(m => m.questionId === qId);
                                                      if (mapping) {
                                                        const currentReqs = mapping.controlBasedRequirements || [];
                                                        const updatedReqs = currentReqs.filter(r => r !== linkedReqId);
                                                        await apiRequest('/rule-version/mappings', {
                                                          method: 'PUT',
                                                          body: JSON.stringify({
                                                            questionId: mapping.questionId,
                                                            controlBasedRequirements: updatedReqs,
                                                          }),
                                                        });
                                                        await loadData();
                                                      }
                                                    } catch (error: any) {
                                                      alert(`Failed to remove question: ${error.message}`);
                                                    }
                                                  }
                                                );
                                              }
                                            }}
                                            className="text-red-600 hover:text-red-800 text-xs"
                                            title="Remove question"
                                          >
                                            🗑️
                                          </button>
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">{q?.text || '—'}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">No questions — click "Add Question" to link</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="text-xs">
                                <div>Requirements: {reqIds.length}</div>
                                <div>Questions: {questionIds.length}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex gap-2">
                          <button
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                  onClick={() => handleEdit('control', ctrl)}
                          >
                            Edit
                          </button>
                                <button
                                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                                  onClick={() => handleDelete('control', ctrl)}
                                >
                                  Delete
                                </button>
                              </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedByPillar).sort((a, b) => {
              // Sort: known pillars first, then UNKNOWN
              if (a === 'UNKNOWN') return 1;
              if (b === 'UNKNOWN') return -1;
              const aIdx = pillars.indexOf(a);
              const bIdx = pillars.indexOf(b);
              if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
              if (aIdx === -1) return 1;
              if (bIdx === -1) return -1;
              return aIdx - bIdx;
            }).map(pillar => {
              const pillarItems = groupedByPillar[pillar] || [];
              if (pillarItems.length === 0) return null;
              
              return (
                <div key={pillar} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b">
                    <h3 className="font-semibold text-gray-800">{pillar.replace(/_/g, ' ')}</h3>
                  </div>
            <div className="p-4 space-y-3">
                    {(organizeBy as string) === 'questions' ? pillarItems.map(({ mapping: m, question: q }: any) => {
                      const reqs = (m.controlBasedRequirements || []).map((rId: any) => ({
                        id: rId,
                        meta: requirements[rId],
                        controls: controlsByRequirement[rId] || [],
                      }));
                      
                      return (
                        <div
                          key={m.questionId}
                          className={`border rounded-lg p-3 transition-colors ${
                            dragOverTarget === m.questionId 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                          onDragOver={(e) => handleDragOver(e, m.questionId)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, m.questionId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono text-gray-800">{m.questionId}</p>
                              <button
                                onClick={() => handleEdit('question', q)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                title="Edit question"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete('question', q)}
                                className="text-red-600 hover:text-red-800 text-xs"
                                title="Delete question"
                              >
                                🗑️
                              </button>
                    </div>
                    <div className="text-xs text-gray-600">
                              {m.controlBasedRequirements?.length || 0} reqs
                    </div>
                  </div>
                          <p className="text-sm text-gray-700 mb-2">{q?.text || '—'}</p>
                          <p className="text-xs text-gray-500 mb-3">{q?.pillar || ''}</p>
                          
                  <div className="mt-3 space-y-3">
                    {reqs.length ? reqs.map((req: any) => (
                              <div
                                key={req.id}
                                className="bg-gray-50 rounded-lg p-3 border border-gray-200 cursor-move"
                                draggable
                                onDragStart={(e) => handleDragStart(e, 'requirement', req.id, m.questionId)}
                              >
                                {/* Requirement Level */}
                                <div className="mb-3">
                                  <div className="group relative">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <p className="text-xs font-mono text-gray-600">{req.id}</p>
                                      <span className="text-xs font-semibold text-gray-800">{req.meta?.title || req.meta?.name || '—'}</span>
                                      {req.meta?.description && (
                                        <span className="text-gray-400 cursor-help text-xs">ℹ️</span>
                                      )}
                                      <button
                                        onClick={() => handleEdit('requirement', req.meta)}
                                        className="text-blue-600 hover:text-blue-800 text-xs"
                                        title="Edit requirement"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={() => handleDelete('requirement', req.meta)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                        title="Delete requirement"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                    {req.meta?.description && (
                                      <>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-1 ml-4">{req.meta.description}</p>
                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-96 p-3 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                          <div className="font-semibold mb-1">{req.meta?.title || req.meta?.name || req.id}</div>
                                          <div>{req.meta.description}</div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Controls Level - Nested under Requirement */}
                                <div className="ml-4 border-l-2 border-purple-300 pl-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs font-semibold text-purple-700">Controls ({req.controls.length})</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {(req.controls || []).length > 0 ? (
                            req.controls.map((c: any) => (
                                        <span
                                          key={c.controlId}
                                          className="px-2 py-1 bg-purple-100 rounded text-xs font-mono flex items-center gap-1 cursor-move group relative"
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, 'control', c.controlId, m.questionId)}
                                          title={`${c.controlId} - ${c.title || c.name || ''}`}
                                        >
                                          {c.controlId}
                                          {(c.title || c.name || c.description) && (
                                            <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                              <div className="font-semibold mb-1">{c.title || c.name || c.controlId}</div>
                                              {c.description && <div>{c.description}</div>}
                                            </span>
                                          )}
                                          <button
                                            onClick={() => handleEdit('control', c)}
                                            className="text-purple-600 hover:text-purple-800"
                                            title="Edit control"
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            onClick={() => handleDeleteControl(c.controlId, req.id)}
                                            className="text-red-600 hover:text-red-800"
                                            title="Remove control"
                                          >
                                            🗑️
                                          </button>
                              </span>
                            ))
                          ) : (
                                      <button
                                        onClick={() => setAddControlModal({ isOpen: true, requirementId: req.id, questionId: m.questionId })}
                                        className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                      >
                                        + Add Control
                                      </button>
                                    )}
                                  </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded inline-block">
                                No requirements mapped — drag requirements here
                      </div>
                    )}
                  </div>
                </div>
                      );
                    }) : organizeBy === 'requirements' ? pillarItems.map(({ requirement: req, questions: questionIds, controls }) => {
                      return (
                        <div
                          key={req.requirementId}
                          className={`border rounded-lg p-3 ${
                            dragOverTarget === req.requirementId 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                          onDragOver={(e) => handleDragOver(e, req.requirementId)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, '', req.requirementId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono text-gray-800">{req.requirementId}</p>
                              <button
                                onClick={() => handleEdit('requirement', req)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                title="Edit requirement"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete('requirement', req)}
                                className="text-red-600 hover:text-red-800 text-xs"
                                title="Delete requirement"
                              >
                                🗑️
                              </button>
            </div>
          </div>
                          <div className="group relative mb-2">
                            <p className="text-sm font-semibold text-gray-700">{req?.title || req?.name || req.requirementId}</p>
                            {req?.description && (
                              <>
                                <span className="ml-1 text-gray-400 cursor-help text-xs">ℹ️</span>
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-96 p-3 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                  <div className="font-semibold mb-1">{req?.title || req?.name || req.requirementId}</div>
                                  <div>{req.description}</div>
                                </div>
                              </>
                            )}
                          </div>
                          {req?.description && (
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{req.description}</p>
                          )}
                          
                          {/* Questions linked to this requirement */}
                          <div className="mt-3 border-l-2 border-blue-300 pl-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-blue-700">
                                Linked Questions ({questionIds.length})
                              </div>
                              <button
                                onClick={() => {
                                  // Open modal to select question to link
                                  const availableQuestions = questions.filter(q => !questionIds.includes(q.questionId));
                                  if (availableQuestions.length === 0) {
                                    alert('All questions are already linked to this requirement');
                                    return;
                                  }
                                  const questionId = prompt(`Enter question ID to link to ${req.requirementId}:\nAvailable: ${availableQuestions.map(q => q.questionId).join(', ')}`);
                                  if (questionId) {
                                    const q = questions.find(q => q.questionId === questionId.trim());
                                    if (q) {
                                      showConfirm(
                                        'Link Question',
                                        `Link question ${questionId} to requirement ${req.requirementId}?`,
                                        async () => {
                                          try {
                                            const mapping = mappings.find(m => m.questionId === questionId.trim());
                                            const currentReqs = mapping?.controlBasedRequirements || [];
                                            if (!currentReqs.includes(req.requirementId)) {
                                              await apiRequest('/rule-version/mappings', {
                                                method: 'PUT',
                                                body: JSON.stringify({
                                                  questionId: questionId.trim(),
                                                  controlBasedRequirements: [...currentReqs, req.requirementId],
                                                }),
                                              });
                                              await loadData();
                                            }
                                          } catch (error: any) {
                                            alert(`Failed to link question: ${error.message}`);
                                          }
                                        }
                                      );
                                    } else {
                                      alert('Question not found');
                                    }
                                  }
                                }}
                                className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                title="Add question to this requirement"
                              >
                                + Add Question
                              </button>
                            </div>
                            {questionIds.length > 0 ? (
                              <div className="space-y-2">
                                {questionIds.map((qId: any) => {
                                  const q = questionsById[qId];
                                  return (
                                    <div 
                                      key={qId} 
                                      className="bg-blue-50 rounded p-2 cursor-move"
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, 'question', qId)}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-xs font-mono text-gray-800">{qId}</p>
                                        <button
                                          onClick={() => handleEdit('question', q)}
                                          className="text-blue-600 hover:text-blue-800 text-xs"
                                          title="Edit question"
                                        >
                                          ✏️
                                        </button>
                                      </div>
                                      <p className="text-xs text-gray-700">{q?.text || '—'}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded inline-block">
                                No questions linked — drag questions here
                              </div>
                            )}
                          </div>

                          {/* Controls linked to this requirement */}
                          <div className="mt-3 border-l-2 border-purple-300 pl-3">
                            <div className="text-xs font-semibold mb-2 text-purple-700">
                              Linked Controls ({controls.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {controls.length > 0 ? controls.map((c) => (
                                <span
                                  key={c.controlId}
                                  className="px-2 py-1 bg-purple-100 rounded text-xs font-mono flex items-center gap-1 group relative cursor-move"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, 'control', c.controlId)}
                                  title={c.description || c.title || c.name}
                                >
                                  {c.controlId}
                                  {c.description && (
                                    <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                      {c.description}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleEdit('control', c)}
                                    className="text-purple-600 hover:text-purple-800"
                                    title="Edit control"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteControl(c.controlId, req.requirementId)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Remove control"
                                  >
                                    🗑️
                                  </button>
                                </span>
                              )) : (
                                <button
                                  onClick={() => setAddControlModal({ isOpen: true, requirementId: req.requirementId })}
                                  className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                >
                                  + Add Control
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }) : pillarItems.map(({ control: ctrl, requirements: reqIds, questions: questionIds }) => {
                      return (
                        <div
                          key={ctrl.controlId}
                          className={`border rounded-lg p-3 ${
                            dragOverTarget === ctrl.controlId 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                          onDragOver={(e) => handleDragOver(e, ctrl.controlId)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, '', '', ctrl.controlId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono text-gray-800 group relative">
                                {ctrl.controlId}
                                {ctrl.description && (
                                  <span className="ml-1 text-gray-400 cursor-help" title={ctrl.description}>
                                    ℹ️
                                  </span>
                                )}
                                {ctrl.description && (
                                  <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                    {ctrl.description}
                                  </span>
                                )}
                              </p>
                              <button
                                onClick={() => handleEdit('control', ctrl)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                title="Edit control"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete('control', ctrl)}
                                className="text-red-600 hover:text-red-800 text-xs"
                                title="Delete control"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">{ctrl?.title || ctrl?.name || '—'}</p>
                          
                          {/* Requirements linked to this control - Same structure as requirements view */}
                          <div className="mt-3 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-green-700">
                                Linked Requirements ({reqIds.length})
                              </div>
                              <button
                                onClick={() => {
                                  const availableReqs = allRequirements.filter(r => !reqIds.includes(r.requirementId));
                                  if (availableReqs.length === 0) {
                                    alert('All requirements are already linked to this control');
                                    return;
                                  }
                                  const reqList = availableReqs.map(r => `${r.requirementId} - ${r.title || r.name || ''}`).join('\n');
                                  const reqId = prompt(`Enter requirement ID to link to control ${ctrl.controlId}:\n\nAvailable requirements:\n${reqList}`);
                                  if (reqId) {
                                    const req = allRequirements.find(r => r.requirementId === reqId.trim());
                                    if (req) {
                                      showConfirm(
                                        'Link Requirement',
                                        `Link requirement ${req.requirementId}${req.title ? ` (${req.title})` : ''} to control ${ctrl.controlId}?`,
                                        async () => {
                                          try {
                                            const control = allControls.find(c => c.controlId === ctrl.controlId);
                                            if (control) {
                                              const currentReqIds = (control.requirementIds || []).map(String);
                                              const reqIdStr = String(req.requirementId);
                                              if (!currentReqIds.includes(reqIdStr)) {
                                                await apiRequest('/controls', {
                                                  method: 'PUT',
                                                  body: JSON.stringify({
                                                    controlId: control.controlId,
                                                    requirementIds: [...currentReqIds, reqIdStr],
                                                  }),
                                                });
                                                await loadData();
                                              }
                                            }
                                          } catch (error: any) {
                                            alert(`Failed to link requirement: ${error.message}`);
                                          }
                                        }
                                      );
                                    } else {
                                      alert('Requirement not found. Please check the requirement ID.');
                                    }
                                  }
                                }}
                                className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded hover:bg-green-100"
                                title="Add requirement to this control"
                              >
                                + Add Requirement
                              </button>
                            </div>
                            {reqIds.length > 0 ? (
                              <div className="space-y-3">
                                {reqIds.map((reqId) => {
                                  // Try multiple ways to find the requirement
                                  let req = requirements[reqId];
                                  if (!req) {
                                    req = allRequirements.find(r => 
                                      r.requirementId === reqId || 
                                      String(r.requirementId) === String(reqId) ||
                                      String(r._id) === String(reqId)
                                    );
                                  }
                                  const reqQuestions = requirementToQuestions[reqId] || requirementToQuestions[req?.requirementId || ''] || [];
                                  const reqControls = controlsByRequirement[String(reqId)] || controlsByRequirement[String(req?.requirementId || '')] || [];
                                  
                                  if (!req) {
                                    return (
                                      <div key={reqId} className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                          <p className="text-xs font-mono text-gray-600">{reqId}</p>
                                          <span className="text-xs text-yellow-700 italic">Requirement not found in database</span>
                                        </div>
                                        <p className="text-xs text-gray-500 ml-4">
                                          This requirement ID is referenced but the requirement data is missing. 
                                          It may have been deleted or the ID format doesn't match.
                                        </p>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div 
                                      key={reqId} 
                                      className="bg-green-50 rounded-lg p-3 border border-green-200 cursor-move"
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, 'requirement', reqId)}
                                    >
                                      {/* Requirement Level */}
                                      <div className="mb-2">
                                        <div className="group relative">
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <p className="text-xs font-mono text-gray-600">{reqId}</p>
                                            {req?.description && (
                                              <span className="text-gray-400 cursor-help text-xs">ℹ️</span>
                                            )}
                                            <button
                                              onClick={() => handleEdit('requirement', req)}
                                              className="text-green-600 hover:text-green-800 text-xs"
                                              title="Edit requirement"
                                            >
                                              ✏️
                                            </button>
                                            <button
                                              onClick={() => {
                                                showConfirm(
                                                  'Remove Requirement',
                                                  `Remove requirement ${reqId} from control ${ctrl.controlId}?`,
                                                  async () => {
                                                    try {
                                                      const control = allControls.find(c => c.controlId === ctrl.controlId);
                                                      if (control) {
                                                        const currentReqIds = (control.requirementIds || []).map(String);
                                                        const updatedReqIds = currentReqIds.filter(id => id !== String(reqId));
                                                        await apiRequest('/controls', {
                                                          method: 'PUT',
                                                          body: JSON.stringify({
                                                            controlId: control.controlId,
                                                            requirementIds: updatedReqIds,
                                                          }),
                                                        });
                                                        await loadData();
                                                      }
                                                    } catch (error: any) {
                                                      alert(`Failed to remove requirement: ${error.message}`);
                                                    }
                                                  }
                                                );
                                              }}
                                              className="text-red-600 hover:text-red-800 text-xs"
                                              title="Remove requirement"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                          <div className="ml-4">
                                            <p className="text-xs font-semibold text-gray-800 mb-1">{req?.title || req?.name || 'No title'}</p>
                                            {req?.description && (
                                              <>
                                                <p className="text-xs text-gray-500 mb-1 line-clamp-2">{req.description}</p>
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-96 p-3 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                                  <div className="font-semibold mb-1">{req?.title || req?.name || reqId}</div>
                                                  <div>{req.description}</div>
                                                </div>
                                              </>
                                            )}
                                            {!req?.description && !req?.title && (
                                              <p className="text-xs text-gray-400 italic mb-1">No description available</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Questions Level - Nested under Requirement */}
                                      <div className="ml-4 border-l-2 border-blue-300 pl-3 mt-2">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <span className="text-xs font-semibold text-blue-700">Questions ({reqQuestions.length})</span>
                                          </div>
                                          <button
                                            onClick={() => {
                                              const availableQuestions = questions.filter(q => !reqQuestions.includes(q.questionId));
                                              if (availableQuestions.length === 0) {
                                                alert('All questions are already linked to this requirement');
                                                return;
                                              }
                                              const questionId = prompt(`Enter question ID to link to requirement ${reqId}:\nAvailable: ${availableQuestions.map(q => q.questionId).slice(0, 10).join(', ')}${availableQuestions.length > 10 ? '...' : ''}`);
                                              if (questionId) {
                                                const q = questions.find(q => q.questionId === questionId.trim());
                                                if (q) {
                                                  showConfirm(
                                                    'Link Question',
                                                    `Link question ${questionId} to requirement ${reqId}?`,
                                                    async () => {
                                                      try {
                                                        const mapping = mappings.find(m => m.questionId === questionId.trim());
                                                        if (mapping) {
                                                          const currentReqs = mapping.controlBasedRequirements || [];
                                                          if (!currentReqs.includes(reqId)) {
                                                            await apiRequest('/rule-version/mappings', {
                                                              method: 'PUT',
                                                              body: JSON.stringify({
                                                                questionId: mapping.questionId,
                                                                controlBasedRequirements: [...currentReqs, reqId],
                                                              }),
                                                            });
                                                            await loadData();
                                                          }
                                                        }
                                                      } catch (error: any) {
                                                        alert(`Failed to link question: ${error.message}`);
                                                      }
                                                    }
                                                  );
                                                } else {
                                                  alert('Question not found');
                                                }
                                              }
                                            }}
                                            className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                                            title="Add question to this requirement"
                                          >
                                            + Add Question
                                          </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {reqQuestions.length > 0 ? reqQuestions.map((qId) => {
                                            const q = questions.find(q => q.questionId === qId);
                                            return (
                                              <span
                                                key={qId}
                                                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono flex items-center gap-1 group relative"
                                                title={`${qId} - ${q?.text || ''}`}
                                              >
                                                {qId}
                                                {q?.text && (
                                                  <span className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                                    <div className="font-semibold mb-1">{qId}</div>
                                                    <div>{q.text}</div>
                                                  </span>
                                                )}
                                                <button
                                                  onClick={() => handleEdit('question', q)}
                                                  className="text-blue-600 hover:text-blue-800"
                                                  title="Edit question"
                                                >
                                                  ✏️
                                                </button>
                                              </span>
                                            );
                                          }) : (
                                            <span className="text-xs text-gray-500 italic">No questions yet</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded inline-block">
                                No requirements linked — drag requirements here
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => handleAdd('question')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Add Question
          </button>
          <button
            onClick={() => handleAdd('requirement')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Add Requirement
          </button>
          <button
            onClick={() => handleAdd('control')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            + Add Control
          </button>
        </div>
      </main>

      {/* Edit Modal */}
      {editModal.isOpen && (
        <EditModal
          type={editModal.type!}
          item={editModal.item}
          onSave={handleSaveEdit}
          onClose={() => setEditModal({ type: null, item: null, isOpen: false })}
          saving={saving}
          mappings={mappings}
          requirementToQuestions={requirementToQuestions}
          allControls={allControls}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-bold mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-4">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm
              </button>
    </div>
          </div>
        </div>
      )}

      {/* Add Control Modal */}
      {addControlModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Add Control to Requirement</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Control</label>
              <select
                className="w-full border rounded p-2"
                onChange={(e) => {
                  if (e.target.value && addControlModal.requirementId) {
                    const control = allControls.find(c => c.controlId === e.target.value);
                    if (control) {
                      const currentReqIds = (control.requirementIds || []).map(String);
                      const reqIdStr = String(addControlModal.requirementId);
                      if (!currentReqIds.includes(reqIdStr)) {
                        showConfirm(
                          'Add Control',
                          `Add control ${control.controlId} to requirement ${addControlModal.requirementId}?`,
                          async () => {
                            try {
                              await apiRequest('/controls', {
                                method: 'PUT',
                                body: JSON.stringify({
                                  controlId: control.controlId,
                                  requirementIds: [...currentReqIds, reqIdStr],
                                }),
                              });
                              setAddControlModal({ isOpen: false });
                              await loadData();
                            } catch (error: any) {
                              alert(`Failed to add control: ${error.message}`);
                            }
                          }
                        );
                      } else {
                        alert('Control already linked to this requirement');
                      }
                    }
                  }
                }}
              >
                <option value="">Select a control...</option>
                {allControls.map(c => (
                  <option key={c.controlId} value={c.controlId}>
                    {c.controlId} - {c.title || c.name || ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setAddControlModal({ isOpen: false })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Requirements Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Edit Requirements for {editing}</h3>
            <textarea
              className="w-full border rounded p-2 text-sm mb-4"
              rows={5}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              placeholder="Chilean Privacy-REQ-001, Chilean Privacy-REQ-002, ..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const updatedList = editValue.split(',').map(s => s.trim()).filter(Boolean);
                  showConfirm(
                    'Save Changes',
                    `Update requirements for ${editing}?`,
                    async () => {
                      try {
                        await apiRequest('/rule-version/mappings', {
                          method: 'PUT',
                          body: JSON.stringify({
                            questionId: editing,
                            controlBasedRequirements: updatedList,
                          }),
                        });
                        setEditing(null);
                        setEditValue('');
                        await loadData();
                      } catch (error: any) {
                        alert(`Failed to save: ${error.message}`);
                      }
                    }
                  );
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Modal Component
function EditModal({ type, item, onSave, onClose, saving, mappings, requirementToQuestions, allControls }: {
  type: 'question' | 'requirement' | 'control';
  item: any;
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
  mappings: Mapping[];
  requirementToQuestions: Record<string, string[]>;
  allControls: Control[];
}) {
  const [formData, setFormData] = useState<any>(item || {});

  useEffect(() => {
    setFormData(item || {});
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">
          {item?._id || item?.requirementId || item?.controlId ? 'Edit' : 'Add'} {type}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'question' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question ID</label>
                <input
                  type="text"
                  value={formData.questionId || ''}
                  onChange={e => setFormData({ ...formData, questionId: e.target.value })}
                  className="w-full border rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                <textarea
                  value={formData.text || ''}
                  onChange={e => setFormData({ ...formData, text: e.target.value })}
                  className="w-full border rounded p-2"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pillar</label>
                <select
                  value={formData.pillar || 'LAWFULNESS_FAIRNESS'}
                  onChange={e => setFormData({ ...formData, pillar: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="LAWFULNESS_FAIRNESS">Lawfulness & Fairness</option>
                  <option value="PURPOSE_LIMITATION">Purpose Limitation</option>
                  <option value="DATA_MINIMIZATION">Data Minimization</option>
                  <option value="PROPORTIONALITY">Proportionality</option>
                  <option value="QUALITY">Quality</option>
                  <option value="ACCOUNTABILITY">Accountability</option>
                  <option value="SECURITY">Security</option>
                  <option value="TRANSPARENCY_CONFIDENTIALITY">Transparency & Confidentiality</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type || 'YES_NO'}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="YES_NO">Yes/No</option>
                  <option value="SINGLE_CHOICE">Single Choice</option>
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  value={formData.order || 0}
                  onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isRequired || false}
                    onChange={e => setFormData({ ...formData, isRequired: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-gray-700">Required</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Requirements (comma-separated IDs)</label>
                <input
                  type="text"
                  value={(() => {
                    // Get requirements from mappings if editing existing question
                    if (item?.questionId) {
                      const mapping = mappings.find(m => m.questionId === item.questionId);
                      return (mapping?.controlBasedRequirements || []).join(', ');
                    }
                    return (formData.linkedRequirements || []).join(', ');
                  })()}
                  onChange={e => {
                    const reqIds = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setFormData({ ...formData, linkedRequirements: reqIds });
                  }}
                  className="w-full border rounded p-2"
                  placeholder="Chilean Privacy-REQ-001, Chilean Privacy-REQ-002"
                />
                <p className="text-xs text-gray-500 mt-1">Requirements linked to this question (used in rule engine mappings)</p>
              </div>
            </>
          )}

          {type === 'requirement' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirement ID</label>
                <input
                  type="text"
                  value={formData.requirementId || ''}
                  onChange={e => setFormData({ ...formData, requirementId: e.target.value })}
                  className="w-full border rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded p-2"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Text</label>
                <textarea
                  value={formData.legalText || ''}
                  onChange={e => setFormData({ ...formData, legalText: e.target.value })}
                  className="w-full border rounded p-2"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pillar</label>
                <select
                  value={formData.pillar || 'ACCOUNTABILITY'}
                  onChange={e => setFormData({ ...formData, pillar: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="LAWFULNESS_FAIRNESS">Lawfulness & Fairness</option>
                  <option value="PURPOSE_LIMITATION">Purpose Limitation</option>
                  <option value="DATA_MINIMIZATION">Data Minimization</option>
                  <option value="PROPORTIONALITY">Proportionality</option>
                  <option value="QUALITY">Quality</option>
                  <option value="ACCOUNTABILITY">Accountability</option>
                  <option value="SECURITY">Security</option>
                  <option value="TRANSPARENCY_CONFIDENTIALITY">Transparency & Confidentiality</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Article</label>
                <input
                  type="text"
                  value={formData.article || ''}
                  onChange={e => setFormData({ ...formData, article: e.target.value })}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                <input
                  type="text"
                  value={formData.chapter || ''}
                  onChange={e => setFormData({ ...formData, chapter: e.target.value })}
                  className="w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Questions (comma-separated IDs)</label>
                <input
                  type="text"
                  value={(() => {
                    if (item?.requirementId) {
                      const questionIds = requirementToQuestions[item.requirementId] || [];
                      return questionIds.join(', ');
                    }
                    return (formData.linkedQuestions || []).join(', ');
                  })()}
                  onChange={e => setFormData({ 
                    ...formData, 
                    linkedQuestions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full border rounded p-2"
                  placeholder="Q-ICT-001, Q-ICT-002"
                />
                <p className="text-xs text-gray-500 mt-1">Questions linked to this requirement (will update rule engine mappings)</p>
              </div>
              
              {/* Dependencies Section - Read-only display */}
              {item?.requirementId && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Dependencies & Relationships</h4>
                  
                  {/* Linked Questions */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Linked Questions ({requirementToQuestions[item.requirementId]?.length || 0})
                    </label>
                    <div className="bg-white border rounded p-2 max-h-32 overflow-y-auto">
                      {requirementToQuestions[item.requirementId]?.length > 0 ? (
                        <div className="space-y-1">
                          {requirementToQuestions[item.requirementId].map((qId: string) => {
                            const q = mappings.find(m => m.questionId === qId);
                            return (
                              <div key={qId} className="text-xs text-gray-700 flex items-center gap-2">
                                <span className="font-mono">{qId}</span>
                                {q && <span className="text-gray-500">- {q.questionId}</span>}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No questions linked</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Linked Controls */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Linked Controls ({(() => {
                        const reqIdStr = String(item.requirementId);
                        return allControls.filter(c => 
                          (c.requirementIds || []).map(String).includes(reqIdStr)
                        ).length;
                      })()})
                    </label>
                    <div className="bg-white border rounded p-2 max-h-32 overflow-y-auto">
                      {(() => {
                        const reqIdStr = String(item.requirementId);
                        const linkedControls = allControls.filter(c => 
                          (c.requirementIds || []).map(String).includes(reqIdStr)
                        );
                        return linkedControls.length > 0 ? (
                          <div className="space-y-1">
                            {linkedControls.map((c) => (
                              <div key={c.controlId} className="text-xs text-gray-700 flex items-center gap-2">
                                <span className="font-mono">{c.controlId}</span>
                                <span className="text-gray-500">- {c.title || c.name || 'No title'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No controls linked</p>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    💡 To modify dependencies, use the main interface or update the linked IDs above.
                  </p>
                </div>
              )}
            </>
          )}

          {type === 'control' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Control ID</label>
                <input
                  type="text"
                  value={formData.controlId || ''}
                  onChange={e => setFormData({ ...formData, controlId: e.target.value })}
                  className="w-full border rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded p-2"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pillar</label>
                <select
                  value={formData.pillar || 'ACCOUNTABILITY'}
                  onChange={e => setFormData({ ...formData, pillar: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="LAWFULNESS_FAIRNESS">Lawfulness & Fairness</option>
                  <option value="PURPOSE_LIMITATION">Purpose Limitation</option>
                  <option value="DATA_MINIMIZATION">Data Minimization</option>
                  <option value="PROPORTIONALITY">Proportionality</option>
                  <option value="QUALITY">Quality</option>
                  <option value="ACCOUNTABILITY">Accountability</option>
                  <option value="SECURITY">Security</option>
                  <option value="TRANSPARENCY_CONFIDENTIALITY">Transparency & Confidentiality</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Control Type</label>
                <select
                  value={formData.controlType || 'TRANSVERSAL'}
                  onChange={e => setFormData({ ...formData, controlType: e.target.value })}
                  className="w-full border rounded p-2"
                >
                  <option value="TRANSVERSAL">Transversal</option>
                  <option value="SPECIFIC">Specific</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Requirement IDs (comma-separated)</label>
                <input
                  type="text"
                  value={(() => {
                    if (item?.controlId) {
                      const control = allControls.find(c => c.controlId === item.controlId);
                      return (control?.requirementIds || []).map(String).join(', ');
                    }
                    return (formData.requirementIds || []).map(String).join(', ');
                  })()}
                  onChange={e => setFormData({ 
                    ...formData, 
                    requirementIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full border rounded p-2"
                  placeholder="Chilean Privacy-REQ-001, Chilean Privacy-REQ-002"
                />
                <p className="text-xs text-gray-500 mt-1">Requirements linked to this control</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded p-2"
                  rows={3}
                  placeholder="Control description..."
                />
                <p className="text-xs text-gray-500 mt-1">Detailed description of the control (shown on hover)</p>
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

