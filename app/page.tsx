'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">Nexus Cloud</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="text-gray-700 hover:text-primary-600">
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      setIsAuthenticated(false);
                      router.push('/');
                    }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-700 hover:text-primary-600">
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            DORA Compliance Made Simple
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Manage your Digital Operational Resilience Act compliance with our comprehensive platform
          </p>
          {!isAuthenticated && (
            <div className="space-x-4">
              <Link
                href="/register"
                className="bg-primary-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-primary-700"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg text-lg border-2 border-primary-600 hover:bg-primary-50"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Questionnaire Wizard</h3>
            <p className="text-gray-600">
              Answer targeted questions to identify which DORA controls apply to your organization
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Asset Management</h3>
            <p className="text-gray-600">
              Catalog your assets with criticality levels and automatically map applicable controls
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Gap Analysis</h3>
            <p className="text-gray-600">
              Identify compliance gaps and generate actionable remediation plans
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

