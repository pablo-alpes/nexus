'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

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
}

interface Requirement {
  requirementId: string;
  title?: string;
  name?: string;
}

interface Control {
  controlId: string;
  title?: string;
  name?: string;
  requirementIds?: string[];
}

export default function RuleEnginePage() {
  const [ruleVersion, setRuleVersion] = useState<RuleVersion | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [requirements, setRequirements] = useState<Record<string, Requirement>>({});
  const [controlsByRequirement, setControlsByRequirement] = useState<Record<string, Control[]>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ ruleVersion: string; mappings: Mapping[]; warning?: string }>('/rule-version/mappings');
      setRuleVersion({ version: res.ruleVersion });
      setMappings(res.mappings || []);
      if (res.warning) {
        console.warn('Rule engine warning:', res.warning);
        alert(`Rule engine warning: ${res.warning}`);
      }
      await Promise.all([loadQuestions(), loadRequirements(), loadControls()]);
    } catch (error) {
      console.error('Failed to load mappings', error);
      alert(`Failed to load rule engine mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const res = await apiRequest<{ questions: Question[] }>('/questionnaire/questions');
      setQuestions(res.questions || []);
    } catch (error) {
      console.warn('Failed to load questions', error);
    }
  };

  const loadRequirements = async () => {
    try {
      const res = await apiRequest<{ requirements: Requirement[] }>('/requirements');
      const map: Record<string, Requirement> = {};
      (res.requirements || []).forEach((r) => {
        if (r.requirementId) map[r.requirementId] = r;
      });
      setRequirements(map);
    } catch (error) {
      console.warn('Failed to load requirements', error);
    }
  };

  const loadControls = async () => {
    try {
      const res = await apiRequest<{ controls: Control[] }>('/controls');
      const map: Record<string, Control[]> = {};
      (res.controls || []).forEach((c) => {
        (c.requirementIds || []).forEach((reqId) => {
          if (!map[reqId]) map[reqId] = [];
          map[reqId].push(c);
        });
      });
      setControlsByRequirement(map);
    } catch (error) {
      console.warn('Failed to load controls', error);
    }
  };

  const startEdit = (mapping: Mapping) => {
    setEditing(mapping.questionId);
    setEditValue(mapping.controlBasedRequirements.join(', '));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updatedList = editValue
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
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
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const questionsById = questions.reduce<Record<string, Question>>((acc, q) => {
    acc[q.questionId] = q;
    return acc;
  }, {});

  const treeData = mappings.map((m) => {
    const q = questionsById[m.questionId];
    const reqs = (m.controlBasedRequirements || []).map((rId) => ({
      id: rId,
      meta: requirements[rId],
      controls: controlsByRequirement[rId] || [],
    }));
    return { mapping: m, question: q, requirements: reqs };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
                Nexus Cloud
              </Link>
              <Link href="/dashboard/rule-engine" className="text-gray-700 hover:text-primary-600">
                Rule Engine
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Rule Engine Mappings</h1>
            {ruleVersion && (
              <p className="text-sm text-gray-600">Rule Version: v{ruleVersion.version}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Blank rows mean no control-based requirements resolved for that question. Add requirementIds and save, then re-run precompute.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mappings.length > 0 && (
              <span className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded">
                Gaps: {mappings.filter(m => !m.controlBasedRequirements || m.controlBasedRequirements.length === 0).length}
              </span>
            )}
            <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
              <button
                className={`px-3 py-1 text-sm rounded ${viewMode === 'table' ? 'bg-white shadow' : 'text-gray-600'}`}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
              <button
                className={`px-3 py-1 text-sm rounded ${viewMode === 'tree' ? 'bg-white shadow' : 'text-gray-600'}`}
                onClick={() => setViewMode('tree')}
              >
                Tree
              </button>
            </div>
            <button
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Text</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coherence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requirements → Controls</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mappings.map((m) => {
                  const q = questionsById[m.questionId];
                  const reqs = m.controlBasedRequirements || [];
                  const isGap = reqs.length === 0;
                  const isThin = reqs.length === 1;
                  return (
                    <tr key={m.questionId}>
                      <td className="px-4 py-3 font-mono text-sm text-gray-800">{m.questionId}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate">{q?.text || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {m.coherenceMetrics
                          ? `${m.coherenceMetrics.overallCoherence.toFixed(1)}% (avg rel ${(m.coherenceMetrics.averageRelevance * 100).toFixed(1)}%)`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {editing === m.questionId ? (
                          <textarea
                            className="w-full border rounded p-2 text-sm"
                            rows={3}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            placeholder="req-1, req-2, ..."
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {reqs.length ? (
                                reqs.map((r) => {
                                  const reqMeta = requirements[r];
                                  const ctrls = controlsByRequirement[r] || [];
                                  return (
                                    <span key={r} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                                      {r}{reqMeta?.title ? ` • ${reqMeta.title}` : ''} ({ctrls.length} controls)
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
                                  No mappings — add requirementIds
                                </span>
                              )}
                            </div>
                            {(isGap || isThin) && (
                              <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded inline-block">
                                {isGap ? 'Gap: 0 requirements' : 'Only 1 requirement — consider adding more if applicable'}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {editing === m.questionId ? (
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 bg-primary-600 text-white rounded text-sm"
                              onClick={saveEdit}
                              disabled={saving}
                            >
                              Save
                            </button>
                            <button
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                              onClick={() => setEditing(null)}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                            onClick={() => startEdit(m)}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 space-y-3">
              {treeData.map(({ mapping, question, requirements: reqs }) => (
                <div key={mapping.questionId} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-gray-800">{mapping.questionId}</p>
                      <p className="text-sm text-gray-700">{question?.text || '—'}</p>
                      <p className="text-xs text-gray-500">{question?.pillar || ''}</p>
                    </div>
                    <div className="text-xs text-gray-600">
                      {mapping.controlBasedRequirements?.length || 0} reqs
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {reqs.length ? reqs.map((req) => (
                      <div key={req.id} className="border-l-2 border-gray-300 pl-3">
                        <p className="text-sm font-mono text-gray-800">{req.id}</p>
                        <p className="text-xs text-gray-600">{req.meta?.title || req.meta?.name || '—'}</p>
                        <div className="ml-2 mt-1 flex flex-wrap gap-2">
                          {(req.controls || []).length ? (
                            req.controls.map((c) => (
                              <span key={c.controlId} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                                {c.controlId}{c.title ? ` • ${c.title}` : ''}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded">
                              No controls linked
                            </span>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded inline-block">
                        No requirements mapped
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

