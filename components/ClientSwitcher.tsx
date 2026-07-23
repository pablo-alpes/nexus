'use client';

/**
 * Client portfolio switcher for cabinet users.
 */

import { useEffect, useState } from 'react';
import { useTenantView } from '@/contexts/TenantViewContext';

interface ClientRow {
  clientId: string;
  name: string;
}

export default function ClientSwitcher() {
  const { clientId, setClientId, role } = useTenantView();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (role === 'CLIENT_USER') return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    fetch('/api/clients', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load clients');
        return r.json();
      })
      .then((data) => {
        const list: ClientRow[] = data.clients || [];
        setClients(list);
        if (!clientId && list.length > 0) {
          setClientId(list[0].clientId);
        }
      })
      .catch((e) => setError(e.message));
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (role === 'CLIENT_USER' || clients.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-slate-600 whitespace-nowrap">Cliente</label>
      <select
        className="border border-slate-300 rounded px-2 py-1 bg-white min-w-[180px]"
        value={clientId || ''}
        onChange={(e) => setClientId(e.target.value || null)}
      >
        <option value="">— seleccionar —</option>
        {clients.map((c) => (
          <option key={c.clientId} value={c.clientId}>
            {c.name}
          </option>
        ))}
      </select>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  );
}
