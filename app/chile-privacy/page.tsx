'use client';

/**
 * Chilean Privacy Law App - Completely Separate Website
 * Route: /chile-privacy
 * No regulation selector - this is a standalone app
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { CHILEAN_PRIVACY_CONFIG } from '@/lib/regulations';

export default function ChilePrivacyHome() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isSpanish = language === 'es';

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const config = CHILEAN_PRIVACY_CONFIG;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">N</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    Nexus Privacy
                  </h1>
                  <p className="text-xs text-gray-500">Ley 21.719</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/chile-privacy/dashboard" 
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                  >
                    {isSpanish ? 'Panel' : 'Dashboard'}
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      setIsAuthenticated(false);
                      router.push('/chile-privacy');
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {isSpanish ? 'Cerrar Sesión' : 'Logout'}
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/chile-privacy/login" 
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                  >
                    {isSpanish ? 'Iniciar Sesión' : 'Login'}
                  </Link>
                  <Link
                    href="/chile-privacy/register"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isSpanish ? 'Registrarse' : 'Sign Up'}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-20 pb-32">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-8">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                {isSpanish 
                  ? 'Diseñado para Cumplimiento de Ley 21.719'
                  : 'Purpose-built for Ley 21.719 Compliance'}
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
                {isSpanish ? 'Cumplimiento de' : 'Privacy Compliance'}
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {isSpanish ? 'Protección de Datos' : 'Made Simple'}
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                {isSpanish
                  ? 'Automatice su cumplimiento de la Ley de Protección de Datos Personales de Chile (Ley 21.719) con nuestra plataforma inteligente.'
                  : 'Automate your Chilean Personal Data Protection Law (Ley 21.719) compliance with our intelligent platform.'}
                <span className="block mt-2 text-lg text-gray-500">
                  {isSpanish
                    ? 'Desde el análisis de brechas hasta la remediación estratégica—todo en un solo lugar.'
                    : 'From gap analysis to strategic remediation—all in one place.'}
                </span>
              </p>

              {!isAuthenticated && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                  <Link
                    href="/chile-privacy/register"
                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                  >
                    <span className="relative z-10">
                      {isSpanish ? 'Comenzar Gratis' : 'Get Started Free'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Link>
                  <Link
                    href="/chile-privacy/login"
                    className="px-8 py-4 bg-white text-blue-600 rounded-xl text-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isSpanish ? 'Iniciar Sesión' : 'Sign In'}
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-16">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">8</div>
                  <div className="text-sm text-gray-600">
                    {isSpanish ? 'Principios Fundamentales' : 'Fundamental Principles'}
                  </div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">ISO 27701</div>
                  <div className="text-sm text-gray-600">
                    {isSpanish ? 'Controles de Privacidad' : 'Privacy Controls'}
                  </div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">72h</div>
                  <div className="text-sm text-gray-600">
                    {isSpanish ? 'Notificación de Brechas' : 'Breach Notification'}
                  </div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">AI</div>
                  <div className="text-sm text-gray-600">
                    {isSpanish ? 'Planificación Estratégica' : 'Strategic Planning'}
                  </div>
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
                {isSpanish
                  ? 'Todo lo que Necesita para Cumplimiento de Ley 21.719'
                  : 'Everything You Need for Ley 21.719 Compliance'}
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {isSpanish
                  ? 'Nuestra plataforma inteligente automatiza todo el viaje de cumplimiento'
                  : 'Our intelligent platform automates the entire compliance journey'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="group relative bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {isSpanish ? 'Cuestionario Inteligente' : 'Intelligent Questionnaire'}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {isSpanish
                    ? 'Responda preguntas dirigidas sobre los 8 principios fundamentales. Nuestro motor de reglas identifica automáticamente qué controles aplican.'
                    : 'Answer targeted questions across 8 fundamental principles. Our AI-powered rule engine automatically identifies which controls apply.'}
                </p>
              </div>

              <div className="group relative bg-gradient-to-br from-white to-indigo-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-indigo-200">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {isSpanish ? 'Análisis Automatizado de Brechas' : 'Automated Gap Analysis'}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {isSpanish
                    ? 'Identifique brechas de cumplimiento instantáneamente. Referencia cruzada de activos, controles y requisitos para obtener una imagen completa.'
                    : 'Identify compliance gaps instantly. Cross-reference assets, controls, and requirements to get a complete picture.'}
                </p>
              </div>

              <div className="group relative bg-gradient-to-br from-white to-purple-50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-purple-200">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {isSpanish ? 'Planes de Remediation Estratégicos' : 'Strategic Remediation Plans'}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {isSpanish
                    ? 'Obtenga recomendaciones estratégicas con análisis de inversión, enfoque por fases y asignación de recursos.'
                    : 'Get AI-powered strategic recommendations with investment analysis, phased approach, and resource allocation.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!isAuthenticated && (
          <section className="py-24 bg-gradient-to-r from-blue-600 to-indigo-700">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                {isSpanish
                  ? '¿Listo para Simplificar el Cumplimiento de Privacidad?'
                  : 'Ready to Simplify Privacy Compliance?'}
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                {isSpanish
                  ? 'Únase a las organizaciones que usan Nexus Privacy para automatizar su cumplimiento de Ley 21.719.'
                  : 'Join organizations using Nexus Privacy to automate their Ley 21.719 compliance journey.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/chile-privacy/register"
                  className="px-8 py-4 bg-white text-blue-600 rounded-xl text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  {isSpanish ? 'Comenzar Prueba Gratuita' : 'Start Free Trial'}
                </Link>
                <Link
                  href="/chile-privacy/login"
                  className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-200"
                >
                  {isSpanish ? 'Iniciar Sesión' : 'Sign In'}
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
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">N</span>
                  </div>
                  <span className="text-white font-semibold">Nexus Privacy</span>
                </div>
                <p className="text-sm text-gray-400">
                  {isSpanish
                    ? 'Cumplimiento de protección de datos hecho simple.'
                    : 'Privacy compliance management made simple.'}
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">{isSpanish ? 'Legal' : 'Legal'}</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/chile-privacy/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                      {isSpanish ? 'Términos de Servicio' : 'Terms of Service'}
                    </Link>
                  </li>
                  <li>
                    <Link href="/chile-privacy/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                      {isSpanish ? 'Política de Privacidad' : 'Privacy Policy'}
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">
                  {isSpanish ? 'Descargo de Responsabilidad' : 'Disclaimer'}
                </h4>
                <p className="text-xs text-gray-500">
                  {isSpanish
                    ? 'Nexus Privacy es una herramienta de gestión de cumplimiento. No garantiza el cumplimiento. Los usuarios son responsables de asegurar el cumplimiento de todas las regulaciones aplicables.'
                    : 'Nexus Privacy is a compliance management tool. It does not guarantee compliance. Users are responsible for ensuring compliance with all applicable regulations.'}
                </p>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm">
              © {new Date().getFullYear()} Nexus Privacy. {isSpanish ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
