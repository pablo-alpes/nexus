'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import UserContextBar from '@/components/UserContextBar';

interface Approval {
  _id: string;
  workflowId: string;
  changeType: string;
  entityId: string;
  entityType: string;
  affiliateId: string;
  organizationId: string;
  requestedBy: {
    _id: string;
    name: string;
    email: string;
  };
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  rejectedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  rejectedAt?: string;
  comments?: string;
  changeDetails: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [actionComments, setActionComments] = useState('');

  useEffect(() => {
    loadApprovals();
  }, [filter]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await apiRequest<{ approvals: Approval[] }>(`/approvals${params}`);
      setApprovals(res.approvals || []);
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (workflowId: string) => {
    try {
      await apiRequest('/approvals', {
        method: 'PUT',
        body: JSON.stringify({
          workflowId,
          action: 'approve',
          comments: actionComments,
        }),
      });
      setSelectedApproval(null);
      setActionComments('');
      loadApprovals();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleReject = async (workflowId: string) => {
    try {
      await apiRequest('/approvals', {
        method: 'PUT',
        body: JSON.stringify({
          workflowId,
          action: 'reject',
          comments: actionComments,
        }),
      });
      setSelectedApproval(null);
      setActionComments('');
      loadApprovals();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'QUESTIONNAIRE_RESPONSE':
        return 'Questionnaire Response';
      case 'REMEDIATION_PLAN':
        return 'Remediation Plan';
      case 'EVIDENCE_SUBMISSION':
        return 'Evidence Submission';
      case 'ROADMAP_EDIT':
        return 'Roadmap Edit';
      default:
        return changeType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 mr-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Approval Workflows</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* User Context Bar */}
      <UserContextBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4 py-2 rounded-md ${
              filter === 'PENDING'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-4 py-2 rounded-md ${
              filter === 'APPROVED'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`px-4 py-2 rounded-md ${
              filter === 'REJECTED'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Approvals List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {approvals.map((approval) => (
                <tr key={approval._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getChangeTypeLabel(approval.changeType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {approval.requestedBy?.name || approval.requestedBy?.email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(approval.requestedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(approval.status)}`}>
                      {approval.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {approval.status === 'PENDING' && (
                      <button
                        onClick={() => setSelectedApproval(approval)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Review
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedApproval(approval)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {approvals.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No approvals found</p>
            </div>
          )}
        </div>

        {/* Approval Detail Modal */}
        {selectedApproval && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Approval Details</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <p className="text-sm text-gray-900">{getChangeTypeLabel(selectedApproval.changeType)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested By</label>
                  <p className="text-sm text-gray-900">
                    {selectedApproval.requestedBy?.name} ({selectedApproval.requestedBy?.email})
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested At</label>
                  <p className="text-sm text-gray-900">{new Date(selectedApproval.requestedAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedApproval.status)}`}>
                    {selectedApproval.status}
                  </span>
                </div>
                {selectedApproval.comments && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                    <p className="text-sm text-gray-900">{selectedApproval.comments}</p>
                  </div>
                )}
                {selectedApproval.changeDetails && selectedApproval.changeDetails.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Changes</label>
                    <div className="mt-2 space-y-2">
                      {selectedApproval.changeDetails.map((change, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded">
                          <p className="text-xs font-medium text-gray-700">{change.field}</p>
                          <p className="text-xs text-gray-600">Old: {JSON.stringify(change.oldValue)}</p>
                          <p className="text-xs text-gray-600">New: {JSON.stringify(change.newValue)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedApproval.status === 'PENDING' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                  <textarea
                    value={actionComments}
                    onChange={(e) => setActionComments(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Add comments for approval/rejection..."
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedApproval(null);
                    setActionComments('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedApproval.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleReject(selectedApproval.workflowId)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedApproval.workflowId)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

