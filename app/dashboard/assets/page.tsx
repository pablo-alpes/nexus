'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import UserContextBar from '@/components/UserContextBar';
import { useApiParams } from '@/hooks/useApiParams';

interface Asset {
  _id: string;
  assetId: string;
  name: string;
  description: string;
  assetType: string;
  criticalityLevel: number;
  owner?: string;
  location?: string;
  controls: any[];
}

export default function AssetsPage() {
  const router = useRouter();
  const { getApiUrl } = useApiParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assetType: 'APPLICATION',
    criticalityLevel: 1,
    owner: '',
    location: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAssets();
  }, [getApiUrl]);

  const loadAssets = async () => {
    try {
      const url = getApiUrl('/assets');
      const response = await apiRequest<{ assets: Asset[] }>(url);
      setAssets(response.assets);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = getApiUrl('/assets');
      await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        assetType: 'APPLICATION',
        criticalityLevel: 1,
        owner: '',
        location: '',
      });
      loadAssets();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getCriticalityColor = (level: number) => {
    switch (level) {
      case 4: return 'bg-red-100 text-red-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 1: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCriticalityLabel = (level: number) => {
    switch (level) {
      case 4: return 'Critical';
      case 3: return 'High';
      case 2: return 'Medium';
      case 1: return 'Low';
      default: return 'Unknown';
    }
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
              <Link href="/dashboard/assets" className="text-gray-700 hover:text-primary-600">
                Assets
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* User Context Bar */}
      <UserContextBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            {showForm ? 'Cancel' : 'Add Asset'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Asset</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Type *
                  </label>
                  <select
                    value={formData.assetType}
                    onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="APPLICATION">Application</option>
                    <option value="DATABASE">Database</option>
                    <option value="NETWORK">Network</option>
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="THIRD_PARTY_SERVICE">Third Party Service</option>
                    <option value="DATA_STORAGE">Data Storage</option>
                    <option value="SECURITY_TOOL">Security Tool</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Criticality Level *
                  </label>
                  <select
                    value={formData.criticalityLevel}
                    onChange={(e) => setFormData({ ...formData, criticalityLevel: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value={1}>Level 1 - Low</option>
                    <option value={2}>Level 2 - Medium</option>
                    <option value={3}>Level 3 - High</option>
                    <option value={4}>Level 4 - Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner
                  </label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Asset'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No assets added yet. Add your first asset to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <div key={asset._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{asset.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCriticalityColor(asset.criticalityLevel)}`}>
                    {getCriticalityLabel(asset.criticalityLevel)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Type:</strong> {asset.assetType}</p>
                  {asset.owner && <p><strong>Owner:</strong> {asset.owner}</p>}
                  {asset.location && <p><strong>Location:</strong> {asset.location}</p>}
                  <p><strong>Controls:</strong> {asset.controls?.length || 0} mapped</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

