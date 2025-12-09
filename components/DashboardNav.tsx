'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiRequest } from '@/lib/api';

interface DashboardNavProps {
  user?: any;
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user?.role === 'SUPER_ADMIN') {
          const [orgsRes, affsRes] = await Promise.all([
            apiRequest<{ organizations: any[] }>('/organizations').catch(() => ({ organizations: [] })),
            apiRequest<{ affiliates: any[] }>('/affiliates').catch(() => ({ affiliates: [] })),
          ]);
          setOrganizations(orgsRes.organizations || []);
          setAffiliates(affsRes.affiliates || []);
        }
      } catch (error) {
        console.error('Failed to load navigation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const isActive = (path: string) => pathname === path;
  const isActiveParent = (paths: string[]) => paths.some(path => pathname?.startsWith(path));

  const handleMouseEnter = (dropdown: string) => {
    setOpenDropdown(dropdown);
  };

  const handleMouseLeave = () => {
    setOpenDropdown(null);
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
              Nexus Cloud
            </Link>
            
            {/* Main Links */}
            <Link 
              href="/dashboard" 
              className={`text-gray-700 hover:text-primary-600 ${isActive('/dashboard') ? 'text-primary-600 font-medium' : ''}`}
            >
              Dashboard
            </Link>
            
            <Link 
              href="/dashboard/questionnaire" 
              className={`text-gray-700 hover:text-primary-600 ${isActive('/dashboard/questionnaire') ? 'text-primary-600 font-medium' : ''}`}
            >
              Questionnaire
            </Link>
            
            <Link 
              href="/dashboard/assets" 
              className={`text-gray-700 hover:text-primary-600 ${isActive('/dashboard/assets') ? 'text-primary-600 font-medium' : ''}`}
            >
              Assets
            </Link>
            
            <Link 
              href="/dashboard/gap-analysis" 
              className={`text-gray-700 hover:text-primary-600 ${isActive('/dashboard/gap-analysis') ? 'text-primary-600 font-medium' : ''}`}
            >
              Gap Analysis
            </Link>
            
            <Link 
              href="/dashboard/remediation" 
              className={`text-gray-700 hover:text-primary-600 ${isActive('/dashboard/remediation') ? 'text-primary-600 font-medium' : ''}`}
            >
              Remediation
            </Link>
            
            <Link 
              href="/dashboard/roadmap" 
              className={`text-gray-700 hover:text-primary-600 ${isActive('/dashboard/roadmap') ? 'text-primary-600 font-medium' : ''}`}
            >
              Roadmap
            </Link>

            {/* Organization & Users Dropdown */}
            <div 
              className="relative dropdown-container"
              onMouseEnter={() => handleMouseEnter('org-users')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`text-gray-700 hover:text-primary-600 flex items-center ${
                  isActiveParent(['/dashboard/organizations', '/dashboard/users', '/dashboard/approvals']) 
                    ? 'text-primary-600 font-medium' 
                    : ''
                }`}
              >
                Organization & Users
                <svg 
                  className={`ml-1 h-4 w-4 transition-transform ${openDropdown === 'org-users' ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {openDropdown === 'org-users' && (
                <div 
                  className="absolute left-0 top-full w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                  onMouseEnter={() => handleMouseEnter('org-users')}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    href="/dashboard/organizations"
                    className={`block px-4 py-2 text-sm ${
                      isActive('/dashboard/organizations')
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Organizations
                  </Link>
                  <Link
                    href="/dashboard/users"
                    className={`block px-4 py-2 text-sm ${
                      isActive('/dashboard/users')
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    href="/dashboard/approvals"
                    className={`block px-4 py-2 text-sm ${
                      isActive('/dashboard/approvals')
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Approvals
                  </Link>
                </div>
              )}
            </div>

            {/* Vue (View) Dropdown - Only for SuperAdmin */}
            {user?.role === 'SUPER_ADMIN' && (
              <div 
                className="relative dropdown-container"
                onMouseEnter={() => handleMouseEnter('view')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className={`text-gray-700 hover:text-primary-600 flex items-center ${
                    isActive('/dashboard/compliance-overview') 
                      ? 'text-primary-600 font-medium' 
                      : ''
                  }`}
                >
                  Vue
                  <svg 
                    className={`ml-1 h-4 w-4 transition-transform ${openDropdown === 'view' ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {openDropdown === 'view' && (
                  <div 
                    className="absolute left-0 top-full w-64 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 max-h-96 overflow-y-auto"
                    onMouseEnter={() => handleMouseEnter('view')}
                    onMouseLeave={handleMouseLeave}
                  >
                    {!loading && organizations.length > 0 ? (
                      <>
                        {organizations.map((org) => {
                          const orgAffiliates = affiliates.filter(aff => String(aff.organizationId) === String(org._id));
                          return (
                            <div key={String(org._id)}>
                              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                📁 {org.name}
                              </div>
                              {orgAffiliates.length > 0 && (
                                <div className="pl-4">
                      {orgAffiliates.map((aff) => (
                        <Link
                          key={String(aff._id)}
                          href={`/dashboard/compliance-overview?organizationId=${org._id}&affiliateId=${aff._id}`}
                          className={`block px-4 py-2 text-sm ${
                            pathname === '/dashboard/compliance-overview'
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          └─ {aff.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  <Link
                    href={`/dashboard/compliance-overview?organizationId=${org._id}`}
                    className={`block px-4 py-2 text-sm ${
                      pathname === '/dashboard/compliance-overview'
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    └─ Organization Overview
                  </Link>
                            </div>
                          );
                        })}
                        <div className="border-t border-gray-100 mt-1">
                          <Link
                            href="/dashboard/compliance-overview"
                            className={`block px-4 py-2 text-sm ${
                              isActive('/dashboard/compliance-overview')
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            🌐 All Organizations Overview
                          </Link>
                        </div>
                      </>
                    ) : (
                      <Link
                        href="/dashboard/compliance-overview"
                        className={`block px-4 py-2 text-sm ${
                          isActive('/dashboard/compliance-overview')
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Organization Overview
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Rules & Requirements Dropdown */}
            <div 
              className="relative dropdown-container"
              onMouseEnter={() => handleMouseEnter('rules')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`text-gray-700 hover:text-primary-600 flex items-center ${
                  isActiveParent(['/dashboard/requirements', '/dashboard/controls', '/dashboard/rule-engine']) 
                    ? 'text-primary-600 font-medium' 
                    : ''
                }`}
              >
                Rules & Requirements
                <svg 
                  className={`ml-1 h-4 w-4 transition-transform ${openDropdown === 'rules' ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {openDropdown === 'rules' && (
                <div 
                  className="absolute left-0 top-full w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                  onMouseEnter={() => handleMouseEnter('rules')}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    href="/dashboard/requirements"
                    className={`block px-4 py-2 text-sm ${
                      isActive('/dashboard/requirements')
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Requirements
                  </Link>
                  <Link
                    href="/dashboard/controls"
                    className={`block px-4 py-2 text-sm ${
                      isActive('/dashboard/controls')
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Controls
                  </Link>
                  <Link
                    href="/dashboard/rule-engine"
                    className={`block px-4 py-2 text-sm ${
                      isActive('/dashboard/rule-engine')
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Rule Engine
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

