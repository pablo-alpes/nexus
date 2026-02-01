'use client';

/**
 * Chilean Privacy Login Page
 * Route: /chile-privacy/login
 */

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

export default function ChilePrivacyLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try test login first if in test mode
      try {
        const testResponse = await apiRequest<{ token: string; user: any; message?: string }>('/auth/test-login', {
          method: 'POST',
        });
        
        if (testResponse.token) {
          localStorage.setItem('token', testResponse.token);
          // Force redirect to Chilean Privacy dashboard - use replace to prevent back navigation
          window.location.replace('/chile-privacy/dashboard');
          return; // Ensure we don't continue execution
        }
      } catch (testErr) {
        // Test login not available, continue with normal login
      }

      const response = await apiRequest<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('token', response.token);
      // Force redirect to Chilean Privacy dashboard - use replace to prevent back navigation
      window.location.replace('/chile-privacy/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">
          Login to Nexus Privacy
        </h1>
        
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Test Mode:</strong> Click "Quick Test Login" to bypass authentication
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                console.log('🔐 Quick Test Login clicked - Chilean Privacy');
                const response = await apiRequest<{ token: string; user: any }>('/auth/test-login', {
                  method: 'POST',
                });
                localStorage.setItem('token', response.token);
                console.log('✅ Token saved, redirecting to /chile-privacy/dashboard');
                // Force redirect to Chilean Privacy dashboard - use replace to prevent back navigation
                const redirectUrl = '/chile-privacy/dashboard';
                console.log('📍 Redirect URL:', redirectUrl);
                window.location.replace(redirectUrl);
              } catch (err: any) {
                console.error('❌ Test login error:', err);
                setError(err.message || 'Test login not available');
              }
            }}
            className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Quick Test Login (No Password Required)
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/chile-privacy/register" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
