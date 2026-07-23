'use client';

/**
 * Dashboard Layout with Sidebar + tenant (cabinet/client) context
 */

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ClientSwitcher from '@/components/ClientSwitcher';
import { TenantViewProvider } from '@/contexts/TenantViewContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }

    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarCollapsed(event.detail.collapsed);
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);

    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  return (
    <TenantViewProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar isChileanPrivacy={true} />
        <main
          className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
        >
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur px-6 py-3 flex justify-end">
            <ClientSwitcher />
          </div>
          {children}
        </main>
      </div>
    </TenantViewProvider>
  );
}
