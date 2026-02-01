'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// DORA-only home page - no regulation selector

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">N</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  Nexus Cloud
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      setIsAuthenticated(false);
                      router.push('/');
                    }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-indigo-50 pt-20 pb-32">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium mb-8">
                <span className="w-2 h-2 bg-primary-600 rounded-full mr-2 animate-pulse"></span>
                Purpose-built for DORA Compliance
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
                DORA Compliance
                <span className="block bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                  Made Simple
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Automate your Digital Operational Resilience Act compliance with our intelligent platform.
                <span className="block mt-2 text-lg text-gray-500">
                  From gap analysis to strategic remediation—all in one place.
                </span>
              </p>

              {/* CTA Buttons */}
              {!isAuthenticated && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                  <Link
                    href="/register"
                    className="group relative px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                  >
                    <span className="relative z-10">Get Started Free</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-800 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 bg-white text-primary-600 rounded-xl text-lg font-semibold border-2 border-primary-600 hover:bg-primary-50 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-16">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-primary-600 mb-2">250+</div>
                  <div className="text-sm text-gray-600">DORA Requirements</div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-primary-600 mb-2">137</div>
                  <div className="text-sm text-gray-600">ISO Controls</div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-primary-600 mb-2">70%</div>
                  <div className="text-sm text-gray-600">Time Saved</div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-primary-600 mb-2">AI</div>
                  <div className="text-sm text-gray-600">Strategic Planning</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Everything You Need for DORA Compliance
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our intelligent platform automates the entire compliance journey
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group relative bg-gradient-to-br from-white to-primary-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-primary-200">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Intelligent Questionnaire</h3>
                <p className="text-gray-600 leading-relaxed">
                  Answer 24 targeted questions across 5 DORA pillars. Our AI-powered rule engine automatically identifies which controls apply to your organization.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group relative bg-gradient-to-br from-white to-indigo-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-indigo-200">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Asset Management</h3>
                <p className="text-gray-600 leading-relaxed">
                  Catalog assets with criticality levels. Automatic control mapping based on asset type and criticality—no manual configuration needed.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group relative bg-gradient-to-br from-white to-purple-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-purple-200">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Automated Gap Analysis</h3>
                <p className="text-gray-600 leading-relaxed">
                  Identify compliance gaps instantly. Cross-reference assets, controls, and requirements to get a complete picture of your compliance posture.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group relative bg-gradient-to-br from-white to-green-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-green-200">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Strategic Remediation Plans</h3>
                <p className="text-gray-600 leading-relaxed">
                  Get AI-powered strategic recommendations with investment analysis, phased approach, and resource allocation. Know exactly where to invest.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="group relative bg-gradient-to-br from-white to-orange-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-orange-200">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Evidence Management</h3>
                <p className="text-gray-600 leading-relaxed">
                  Securely store and manage compliance evidence. Encrypted Azure Blob Storage with automatic linking to controls and requirements.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="group relative bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Real-time Dashboards</h3>
                <p className="text-gray-600 leading-relaxed">
                  Track compliance progress across all 5 DORA pillars. Get instant insights into your compliance percentage and risk exposure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-gradient-to-br from-gray-50 to-primary-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Why Choose Nexus Cloud?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Purpose-built for DORA with intelligent automation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">DORA-First Approach</h3>
                    <p className="text-gray-600">Pre-mapped 250+ requirements to 137 ISO controls. No configuration needed—start immediately.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Intelligent Automation</h3>
                    <p className="text-gray-600">Rule engine reduces manual work by 70%+. From questionnaire to remediation plan—fully automated.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Strategic Investment Planning</h3>
                    <p className="text-gray-600">AI-powered recommendations show you where to invest, with ROI calculations and phased approaches.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Transparent & Auditable</h3>
                    <p className="text-gray-600">Open-source foundation with auditable algorithms. Know exactly how decisions are made.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full mb-4">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Fast Implementation</h3>
                    <p className="text-gray-600">Get up and running in minutes, not months. Auto-setup gets you started immediately.</p>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600">Time to Value</span>
                      <span className="text-2xl font-bold text-primary-600">Days</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-600">vs. Generic Platforms</span>
                      <span className="text-2xl font-bold text-gray-400">Months</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!isAuthenticated && (
          <section className="py-24 bg-gradient-to-r from-primary-600 to-indigo-700">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Simplify DORA Compliance?
              </h2>
              <p className="text-xl text-primary-100 mb-8">
                Join financial institutions using Nexus Cloud to automate their DORA compliance journey.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-white text-primary-600 rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-200"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">N</span>
                  </div>
                  <span className="text-white font-semibold">Nexus Cloud</span>
                </div>
                <p className="text-sm text-gray-400">
                  DORA compliance management made simple.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/terms-of-service" className="text-sm text-gray-400 hover:text-white transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy-policy" className="text-sm text-gray-400 hover:text-white transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Disclaimer</h4>
                <p className="text-xs text-gray-500">
                  Nexus Cloud is a compliance management tool. It does not guarantee compliance. 
                  Users are responsible for ensuring compliance with all applicable regulations.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm">
              © {new Date().getFullYear()} Nexus Cloud. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

