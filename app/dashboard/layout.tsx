'use client';

/**
 * Dashboard Layout with Sidebar
 * Provides sidebar navigation for all dashboard pages
 */

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

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

    // Listen for sidebar toggle events
    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarCollapsed(event.detail.collapsed);
    };

    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);

    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isChileanPrivacy={false} />
      <main 
        className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}
      >
        {children}
      </main>
    </div>
  );
}
