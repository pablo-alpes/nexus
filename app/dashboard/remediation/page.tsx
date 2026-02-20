'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest, uploadFile } from '@/lib/api';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { RegulationType, getRegulationConfig } from '@/lib/regulations';
import { LanguageToggle } from '@/components/LanguageToggle';



export default function RemediationPage() {
  const router = useRouter();
  const { language } = useTranslation();
  const pathname = usePathname();
  const isChileanPrivacy = pathname?.includes('chile-privacy') || pathname?.includes('chilean-privacy');
  const regulationType = isChileanPrivacy ? RegulationType.CHILEAN_PRIVACY : RegulationType.DORA;
  const config = getRegulationConfig(regulationType);
  const pillars = config.pillars.map(p => ({
    value: p.id,
    label: p.name,
  }));
  // Set default pillar based on regulation
  const defaultPillar = pillars.length > 0 ? pillars[0].value : (isChileanPrivacy ? 'LAWFULNESS_FAIRNESS' : 'ICT_RISK_MANAGEMENT');
  const [selectedPillar, setSelectedPillar] = useState<string>(defaultPillar);
  const [tableData, setTableData] = useState<any[]>([]);
  const [remediationPlan, setRemediationPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'actions' | 'strategy'>('actions');

  // Update default pillar when regulation changes
  useEffect(() => {
    const newDefaultPillar = pillars.length > 0 ? pillars[0].value : (isChileanPrivacy ? 'LAWFULNESS_FAIRNESS' : 'ICT_RISK_MANAGEMENT');
    if (!pillars.find(p => p.value === selectedPillar)) {
      // Current selected pillar is not valid for this regulation, switch to default
      setSelectedPillar(newDefaultPillar);
    }
  }, [regulationType, isChileanPrivacy, pillars]);

  useEffect(() => {
    if (selectedPillar) {
      loadRemediationPlan();
    }
  }, [selectedPillar, regulationType]);

  const handleGenerate = async () => {
    if (!selectedPillar) {
      alert(language === 'es' ? 'Por favor seleccione un principio' : 'Please select a pillar');
      return;
    }

    setGenerating(true);
    try {
      const response = await apiRequest('/remediation', {
        method: 'POST',
        body: JSON.stringify({ 
          pillar: selectedPillar,
          regulation: regulationType,
        }),
      });

      setRemediationPlan(response.remediationPlan);
      setTableData(response.tableData || []);
      setSummary(response.summary || null);
      setStrategy(response.strategy || null);
      alert(`Remediation plan generated with ${response.summary?.totalActions || 0} actions.`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const loadRemediationPlan = async () => {
    if (!selectedPillar) {
      // Clear data if no pillar selected
      setTableData([]);
      setRemediationPlan(null);
      setSummary(null);
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest<{ remediationPlans: any[] }>(`/remediation?pillar=${selectedPillar}&regulation=${regulationType}`);
      
      if (response.remediationPlans && response.remediationPlans.length > 0) {
        const plan = response.remediationPlans[0];
        setRemediationPlan(plan);
        // Note: Strategy is only available when generating a new plan, not when loading existing
        setStrategy(null);
        
        // Generate table data from plan
        if (plan.actions && Array.isArray(plan.actions) && plan.actions.length > 0) {
          const table = plan.actions.map((action: any, index: number) => {
            // Truncate asset names to avoid long text
            const assetText = action.applicableAssets?.map((a: any) => `${a.name} (Level ${a.criticalityLevel})`).join(', ') || 'N/A';
            const truncatedAssetText = assetText.length > 50 ? `${assetText.substring(0, 50)}...` : assetText;
            
            return {
              id: `RMD-${String(index + 1).padStart(4, '0')}`,
              pillar: plan.pillar,
              controlId: action.controlId,
              controlTitle: action.controlTitle || action.action,
              controlNeeded: action.action,
              applicableAssets: truncatedAssetText,
              applicableAssetsFull: assetText, // Keep full text for tooltip
              assetCount: action.applicableAssets?.length || 0,
              status: action.status,
              priority: action.priority,
              evidenceSubmission: action.evidenceIds?.length > 0 ? 'Submitted' : 'Pending',
              evidenceCount: action.evidenceIds?.length || 0,
              evidenceSuggestions: action.evidenceSuggestions || [],
              comment: action.description,
              dueDate: action.dueDate,
              assignedTo: action.assignedTo,
            };
          });
          setTableData(table);
          
          // Calculate summary
          const calculatedSummary = {
            totalActions: table.length,
            critical: table.filter((r: any) => r.priority === 'CRITICAL').length,
            inProgress: table.filter((r: any) => r.status === 'IN_PROGRESS').length,
            completed: table.filter((r: any) => r.status === 'COMPLETED').length,
          };
          setSummary(calculatedSummary);
        } else {
          // No actions in plan
          setTableData([]);
          setSummary(null);
        }
      } else {
        // No plan found for this pillar
        setTableData([]);
        setRemediationPlan(null);
        setSummary(null);
        setStrategy(null);
      }
    } catch (error) {
      console.error('Failed to load remediation plan:', error);
      // Clear data on error
      setTableData([]);
      setRemediationPlan(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (index: number, newStatus: string) => {
    if (!remediationPlan) return;

    try {
      await apiRequest('/remediation', {
        method: 'PUT',
        body: JSON.stringify({
          pillar: selectedPillar,
          actionIndex: index,
          regulation: regulationType,
          updates: { status: newStatus },
        }),
      });

      // Update local state
      const updatedTable = [...tableData];
      updatedTable[index].status = newStatus;
      setTableData(updatedTable);
      
      // Recalculate summary
      const newSummary = {
        totalActions: updatedTable.length,
        critical: updatedTable.filter((r: any) => r.priority === 'CRITICAL').length,
        inProgress: updatedTable.filter((r: any) => r.status === 'IN_PROGRESS').length,
        completed: updatedTable.filter((r: any) => r.status === 'COMPLETED').length,
      };
      setSummary(newSummary);
    } catch (error: any) {
      alert(`Error updating status: ${error.message}`);
    }
  };

  const handleEvidenceUpload = async (actionIndex: number, file: File) => {
    if (!file) return;

    setUploadingEvidence(`${actionIndex}`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('controlId', tableData[actionIndex].controlId);
      formData.append('evidenceType', 'DOCUMENT');
      formData.append('description', `Evidence for ${tableData[actionIndex].controlTitle}`);

      await uploadFile('/evidence/upload', formData);
      alert('Evidence uploaded successfully!');
      loadRemediationPlan(); // Reload to update evidence count
    } catch (error: any) {
      alert(`Error uploading evidence: ${error.message}`);
    } finally {
      setUploadingEvidence(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'NOT_STARTED': return 'bg-gray-100 text-gray-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toFixed(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href={isChileanPrivacy ? '/chile-privacy/dashboard' : '/dashboard'} className={`text-2xl font-bold ${isChileanPrivacy ? 'text-blue-600' : 'text-primary-600'}`}>
                {isChileanPrivacy ? 'Nexus Privacy' : 'Nexus Cloud'}
              </Link>
              <Link href={isChileanPrivacy ? '/chile-privacy/dashboard/remediation' : '/dashboard/remediation'} className="text-gray-700 hover:text-primary-600">
                Remediation Plan
              </Link>
            </div>
            <div className="flex items-center">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold">{isChileanPrivacy ? (language === 'es' ? 'Plan de Remediation' : 'Remediation Plan') : 'Remediation Plan'}</h1>

        {/* Tab Navigation */}
        {remediationPlan && (
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('actions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'actions'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Remediation Actions
              </button>
              <button
                onClick={() => setActiveTab('strategy')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'strategy'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Strategic Overview
                {strategy && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">AI Generated</span>}
              </button>
            </nav>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'es' ? 'Seleccionar Principio' : isChileanPrivacy ? 'Select Principle' : 'Select DORA Pillar'}
              </label>
              <select
                value={selectedPillar}
                onChange={(e) => setSelectedPillar(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                {pillars.map((pillar) => (
                  <option key={pillar.value} value={pillar.value}>
                    {pillar.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Remediation Plan'}
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Actions</p>
              <p className="text-2xl font-bold text-primary-600">{summary.totalActions}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{summary.inProgress}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
            </div>
          </div>
        )}

        {activeTab === 'strategy' && strategy && (
          <div className="space-y-6">
            {/* Strategic Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Strategic Overview</h2>
              <p className="text-gray-700 leading-relaxed">{strategy.overview}</p>
            </div>

            {/* Investment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Investment</h3>
                <p className="text-3xl font-bold text-primary-600">
                  €{formatCurrency(strategy.totalInvestment)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Risk Reduction</h3>
                <p className="text-3xl font-bold text-green-600">
                  {strategy.riskReduction}%
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Max Loss Reduction</h3>
                <p className="text-3xl font-bold text-red-600">
                  €{formatCurrency(strategy.estimatedMaxLossReduction)}
                </p>
              </div>
            </div>

            {/* Investment Breakdown */}
            {strategy.investmentBreakdown && strategy.investmentBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Investment Breakdown by Pillar</h2>
                <div className="space-y-4">
                  {strategy.investmentBreakdown.map((breakdown: any, index: number) => (
                    <div key={index} className="border-l-4 border-primary-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">{breakdown.pillar}</h3>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">
                            €{formatCurrency(breakdown.estimatedCost)}
                          </p>
                          <p className="text-sm text-gray-500">ROI: {breakdown.roi.toFixed(2)}x</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {breakdown.actionCount} actions • Priority: {breakdown.priority}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phased Approach */}
            {strategy.phasedApproach && strategy.phasedApproach.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Phased Implementation Approach</h2>
                <div className="space-y-6">
                  {strategy.phasedApproach.map((phase: any) => (
                    <div key={phase.phase} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Phase {phase.phase}: {phase.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">
                            €{formatCurrency(phase.investment)}
                          </p>
                          <p className="text-sm text-gray-500">{phase.duration}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Risk Reduction</span>
                          <span className="text-sm font-bold text-green-600">{phase.riskReduction}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${phase.riskReduction}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Key Actions:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {phase.actions.slice(0, 5).map((action: string, idx: number) => (
                            <li key={idx}>{action}</li>
                          ))}
                          {phase.actions.length > 5 && (
                            <li className="text-gray-400">+{phase.actions.length - 5} more actions</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Wins */}
            {strategy.quickWins && strategy.quickWins.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Wins</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Start with these high-impact, low-effort controls to build momentum:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  {strategy.quickWins.map((win: string, index: number) => (
                    <li key={index} className="text-gray-700">{win}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resource Allocation */}
            {strategy.resourceAllocation && strategy.resourceAllocation.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Resource Allocation</h2>
                <div className="space-y-4">
                  {strategy.resourceAllocation.map((alloc: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">{alloc.team}</h3>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">
                            {alloc.estimatedHours}h
                          </p>
                          <p className="text-sm text-gray-500">
                            €{formatCurrency(alloc.cost)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {alloc.controls.length} control(s) assigned
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Recommendations */}
            {strategy.keyRecommendations && strategy.keyRecommendations.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-900">Key Recommendations</h2>
                <ul className="space-y-3">
                  {strategy.keyRecommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span className="text-blue-900">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && tableData.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pillar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Control Needed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      For Which Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evidence Submission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evidence Suggestions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.pillar.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{row.controlTitle}</div>
                        <div className="text-xs text-gray-500">{row.controlId}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate" title={row.applicableAssetsFull || row.applicableAssets}>
                          {row.applicableAssets}
                        </div>
                        <div className="text-xs text-gray-400">{row.assetCount} asset(s)</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(row.priority)}`}>
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={row.status}
                          onChange={(e) => handleStatusChange(index, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(row.status)}`}
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span className={row.evidenceSubmission === 'Submitted' ? 'text-green-600' : 'text-gray-400'}>
                            {row.evidenceSubmission}
                          </span>
                          {row.evidenceCount > 0 && (
                            <span className="text-xs text-gray-500">({row.evidenceCount})</span>
                          )}
                        </div>
                        <input
                          type="file"
                          id={`evidence-${index}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleEvidenceUpload(index, file);
                          }}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        />
                        <label
                          htmlFor={`evidence-${index}`}
                          className="mt-1 text-xs text-primary-600 hover:text-primary-700 cursor-pointer underline"
                        >
                          {uploadingEvidence === `${index}` ? 'Uploading...' : 'Upload Evidence'}
                        </label>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs">
                          <ul className="list-disc list-inside text-xs space-y-1">
                            {row.evidenceSuggestions?.slice(0, 3).map((suggestion: string, i: number) => (
                              <li key={i}>{suggestion}</li>
                            ))}
                            {row.evidenceSuggestions?.length > 3 && (
                              <li className="text-gray-400">+{row.evidenceSuggestions.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate" title={row.comment}>
                          {row.comment}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {row.dueDate && (
                          <div className="text-xs text-gray-500">
                            Due: {new Date(row.dueDate).toLocaleDateString()}
                          </div>
                        )}
                        {row.assignedTo && (
                          <div className="text-xs text-gray-500">
                            Assigned: {row.assignedTo}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && tableData.length === 0 && remediationPlan === null && activeTab === 'actions' && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No remediation plan found. Generate one to get started.</p>
          </div>
        )}

        {activeTab === 'strategy' && !strategy && remediationPlan && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">
              Strategic recommendations will be generated when you create a new remediation plan.
            </p>
            <button
              onClick={handleGenerate}
              className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
            >
              Generate Remediation Plan with Strategy
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
