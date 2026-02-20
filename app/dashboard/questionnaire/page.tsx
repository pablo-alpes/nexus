'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RegulationType } from '@/lib/regulations';

interface Question {
  _id: string;
  questionId: string;
  text: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
  isRequired: boolean;
  order: number;
  pillar?: string;
}

interface QuestionnaireResponse {
  _id: string;
  answers: Array<{ questionId: string; value: string }>;
  applicableControls: string[];
  completedAt?: string;
}

interface CoherenceMetrics {
  averageRelevance: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  overallCoherence: number;
}

interface RuleVersionInfo {
  version: string;
  status: string;
  effectiveDate: string;
  precomputedAt?: string;
}

export default function QuestionnairePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedResponse, setSavedResponse] = useState<QuestionnaireResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(false);
  const [ruleVersion, setRuleVersion] = useState<RuleVersionInfo | null>(null);
  const [coherenceMetrics, setCoherenceMetrics] = useState<CoherenceMetrics | null>(null);
  const [overallMetrics, setOverallMetrics] = useState<any>(null);

  // Detect regulation from route
  const isChileanPrivacy = pathname?.includes('chile-privacy') || pathname?.includes('chilean-privacy');
  const regulationType = isChileanPrivacy ? RegulationType.CHILEAN_PRIVACY : RegulationType.DORA;

  useEffect(() => {
    loadQuestions();
    loadSavedResponse();
    loadRuleVersion();
  }, [regulationType]);

  const loadSavedResponse = async () => {
    try {
      const response = await apiRequest<{ response: QuestionnaireResponse | null }>('/questionnaire/response');
      if (response.response) {
        setSavedResponse(response.response);
        // Pre-populate answers from saved response
        const answerMap: Record<string, any> = {};
        response.response.answers.forEach((a: any) => {
          answerMap[a.questionId] = a.value;
        });
        setAnswers(answerMap);
        // If response exists and is completed, show results view automatically
        if (response.response.completedAt) {
          setShowResults(true);
        }
      }
    } catch (error) {
      console.error('Failed to load saved response:', error);
    }
  };

  const loadRuleVersion = async () => {
    try {
      const response = await apiRequest<{
        ruleVersion: RuleVersionInfo;
        coherenceMetrics: CoherenceMetrics;
      }>('/rule-version');
      setRuleVersion(response.ruleVersion);
      setOverallMetrics(response.coherenceMetrics);
    } catch (error) {
      console.error('Failed to load rule version:', error);
    }
  };

  const loadQuestions = async () => {
    try {
      // Pass regulation parameter to API
      const response = await apiRequest<{ questions: Question[] }>(`/questionnaire/questions?regulation=${regulationType}`);
      const sortedQuestions = response.questions.sort((a, b) => a.order - b.order);
      setQuestions(sortedQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));

      const response = await apiRequest<{ 
        response: QuestionnaireResponse; 
        applicableControlsCount: number;
        ruleVersion?: string;
        coherenceMetrics?: CoherenceMetrics;
        mappingCompleteness?: {
          questionsProcessed: number;
          questionsWithMappings: number;
          questionsWithoutMappings: number;
          questionsWithEmptyMappings: number;
          totalRequirementsFound: number;
          mappingCoverage: number;
        };
      }>('/questionnaire/response', {
        method: 'POST',
        body: JSON.stringify({ answers: answerArray, regulation: regulationType }),
      });

      setSavedResponse(response.response);
      if (response.coherenceMetrics) {
        setCoherenceMetrics(response.coherenceMetrics);
      }
      // Store mapping completeness in response for display
      if (response.mappingCompleteness) {
        (response.response as any).mappingCompleteness = response.mappingCompleteness;
      }
      if (response.ruleVersion) {
        // Update rule version if provided
        loadRuleVersion();
      }
      setShowResults(true);
      
      // Don't redirect - show results on same page
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all questionnaire responses? This action cannot be undone.')) {
      return;
    }

    try {
      await apiRequest('/questionnaire/response', {
        method: 'DELETE',
      });

      // Clear local state
      setAnswers({});
      setSavedResponse(null);
      setShowResults(false);
      setCurrentQuestionIndex(0);
      
      alert('Questionnaire responses cleared successfully!');
    } catch (error: any) {
      alert(`Error clearing responses: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="p-8">Loading questions...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="p-8">
        <p>No questions available. Please contact administrator.</p>
      </div>
    );
  }

  // Show results view
  if (showResults && savedResponse) {
    const answersByPillar: Record<string, Array<{ question: Question; answer: any }>> = {};
    
    savedResponse.answers.forEach((answer: any) => {
      const question = questions.find(q => String(q._id) === answer.questionId);
      if (question) {
        const pillar = question.pillar || 'UNKNOWN';
        if (!answersByPillar[pillar]) {
          answersByPillar[pillar] = [];
        }
        answersByPillar[pillar].push({ question, answer });
      }
    });

    const pillarLabels: Record<string, string> = {
      'ICT_RISK_MANAGEMENT': 'ICT Risk Management',
      'INCIDENT_MANAGEMENT': 'ICT-Related Incident Management',
      'RESILIENCE_TESTING': 'Digital Operational Resilience Testing',
      'THIRD_PARTY_RISK': 'ICT Third-Party Risk Management',
      'INFORMATION_SHARING': 'Information Sharing',
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href={isChileanPrivacy ? '/chile-privacy/dashboard' : '/dashboard'} className={`text-2xl font-bold ${isChileanPrivacy ? 'text-blue-600' : 'text-primary-600'}`}>
                {isChileanPrivacy ? 'Nexus Privacy' : 'Nexus Cloud'}
              </Link>
                <Link href={isChileanPrivacy ? '/chile-privacy/dashboard/questionnaire' : '/dashboard/questionnaire'} className="text-gray-700 hover:text-primary-600">
                  Questionnaire
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Questionnaire Results</h1>
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                Clear Responses
              </button>
              <button
                onClick={() => setShowResults(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Edit Responses
              </button>
            </div>
          </div>

          {/* Rule Version & Coherence Quality Banner */}
          {(ruleVersion || overallMetrics) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 mb-6 border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Rule Engine Version & Quality Metrics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Rule Version</p>
                      <p className="text-xl font-bold text-blue-600">
                        v{ruleVersion?.version || 'N/A'}
                      </p>
                      {ruleVersion?.precomputedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Precomputed: {new Date(ruleVersion.precomputedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {overallMetrics && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Overall Coherence</p>
                        <p className="text-xl font-bold text-indigo-600">
                          {overallMetrics.averageCoherence?.toFixed(1) || '0'}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Avg Relevance: {(overallMetrics.averageRelevance * 100)?.toFixed(1) || '0'}%
                        </p>
                      </div>
                    )}
                  </div>
                  {overallMetrics && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Confidence Distribution</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-gray-600">High</p>
                          <p className="text-lg font-bold text-green-600">
                            {overallMetrics.highConfidencePercentage?.toFixed(1) || '0'}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Medium</p>
                          <p className="text-lg font-bold text-yellow-600">
                            {overallMetrics.mediumConfidencePercentage?.toFixed(1) || '0'}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Low</p>
                          <p className="text-lg font-bold text-red-600">
                            {overallMetrics.lowConfidencePercentage?.toFixed(1) || '0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-blue-600">{savedResponse.answers.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Yes Answers</p>
                <p className="text-2xl font-bold text-green-600">
                  {savedResponse.answers.filter((a: any) => a.value === 'yes').length}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Applicable Controls</p>
                <p className="text-2xl font-bold text-purple-600">{savedResponse.applicableControls?.length || 0}</p>
              </div>
            </div>
            {savedResponse.completedAt && (
              <p className="text-sm text-gray-500 mt-4">
                Completed: {new Date(savedResponse.completedAt).toLocaleString()}
              </p>
            )}
            {coherenceMetrics && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Question Coherence Quality</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Overall Coherence</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {coherenceMetrics.overallCoherence?.toFixed(1) || '0'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Avg Relevance</p>
                    <p className="text-lg font-bold text-blue-600">
                      {(coherenceMetrics.averageRelevance * 100)?.toFixed(1) || '0'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">High Confidence</p>
                    <p className="text-lg font-bold text-green-600">
                      {coherenceMetrics.highConfidenceCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Low Confidence</p>
                    <p className="text-lg font-bold text-red-600">
                      {coherenceMetrics.lowConfidenceCount || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {(savedResponse as any)?.mappingCompleteness && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Mapping Completeness</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          (savedResponse as any).mappingCompleteness.mappingCoverage >= 80 
                            ? 'bg-green-600' 
                            : (savedResponse as any).mappingCompleteness.mappingCoverage >= 50
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${(savedResponse as any).mappingCompleteness.mappingCoverage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(savedResponse as any).mappingCompleteness.mappingCoverage.toFixed(1)}% of questions have mappings
                    </p>
                  </div>
                  {(savedResponse as any).mappingCompleteness.questionsWithEmptyMappings > 0 && (
                    <div className="text-xs text-yellow-600 whitespace-nowrap">
                      ⚠️ {(savedResponse as any).mappingCompleteness.questionsWithEmptyMappings} need review
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {Object.entries(answersByPillar).map(([pillar, pillarAnswers]) => (
              <div key={pillar} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {pillarLabels[pillar] || pillar}
                </h2>
                <div className="space-y-3">
                  {pillarAnswers.map(({ question, answer }, idx) => (
                    <div key={idx} className="border-l-4 border-gray-200 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{question.text}</p>
                          <div className="mt-1">
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                              answer.value === 'yes' 
                                ? 'bg-green-100 text-green-800'
                                : answer.value === 'no'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {answer.value === 'yes' ? 'Yes' : answer.value === 'no' ? 'No' : 'Not Applicable'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Results Disclaimer */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mt-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  Next Steps - Review Required
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  The controls identified above are based on your questionnaire responses and our rule engine logic. 
                  <strong> This is not legal advice.</strong>
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  <li>Review all identified controls for accuracy and completeness</li>
                  <li>Manually add or remove controls as needed based on your specific situation</li>
                  <li>Consult with {isChileanPrivacy ? 'Ley 21.719 compliance' : 'DORA compliance'} experts to validate your compliance approach</li>
                  <li>Regularly update your compliance status as your organization evolves</li>
                </ul>
                <p className="text-xs text-blue-600 mt-3">
                  By proceeding, you acknowledge that you understand these controls are recommendations based on automated analysis, 
                  and you are responsible for ensuring compliance. See our <Link href="/terms-of-service" className="underline font-medium">Terms of Service</Link> for details.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href={isChileanPrivacy ? '/chile-privacy/dashboard/gap-analysis' : '/dashboard/gap-analysis'}
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
            >
              Generate Gap Analysis
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href={isChileanPrivacy ? '/chile-privacy/dashboard' : '/dashboard'} className={`text-2xl font-bold ${isChileanPrivacy ? 'text-blue-600' : 'text-primary-600'}`}>
                {isChileanPrivacy ? 'Nexus Privacy' : 'Nexus Cloud'}
              </Link>
              <Link href={isChileanPrivacy ? '/chile-privacy/dashboard/questionnaire' : '/dashboard/questionnaire'} className="text-gray-700 hover:text-primary-600">
                Questionnaire
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">{isChileanPrivacy ? 'Ley 21.719 compliance' : 'DORA compliance'} Questionnaire</h1>

        {/* Disclaimer and Acknowledgment */}
        {!acknowledgedDisclaimer && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  Important Disclaimer
                </h3>
                <p className="text-sm text-yellow-700 mb-4">
                  <strong>Nexus {isChileanPrivacy ? 'Privacy' : 'Cloud'} is a compliance management tool</strong> that assists organizations in identifying and managing {isChileanPrivacy ? 'Ley 21.719 compliance' : 'DORA compliance'} requirements. 
                  This questionnaire helps identify applicable controls but does <strong>not guarantee compliance</strong>.
                </p>
                <div className="bg-white p-4 rounded border border-yellow-200 mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">You are responsible for:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>Accurately answering all questions based on your organization's actual practices</li>
                    <li>Reviewing and validating all identified controls for accuracy and completeness</li>
                    <li>Ensuring full compliance with all applicable DORA requirements</li>
                    <li>Consulting with legal and compliance experts as needed</li>
                    <li>Regularly updating your compliance status as your organization evolves</li>
                  </ul>
                </div>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="acknowledge-disclaimer"
                    checked={acknowledgedDisclaimer}
                    onChange={(e) => setAcknowledgedDisclaimer(e.target.checked)}
                    className="mt-1 mr-3 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="acknowledge-disclaimer" className="text-sm text-yellow-800">
                    I understand and acknowledge that:
                    <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                      <li>Nexus {isChileanPrivacy ? 'Privacy' : 'Cloud'} is a tool to assist with compliance management, not a guarantee of compliance</li>
                      <li>I am solely responsible for ensuring my organization's compliance with {isChileanPrivacy ? 'Ley 21.719 regulations' : 'DORA regulations'}</li>
                      <li>I will review all identified controls and consult with compliance experts as needed</li>
                      <li>I have read and agree to the <Link href="/terms-of-service" className="underline font-medium">Terms of Service</Link></li>
                    </ul>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {acknowledgedDisclaimer && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">{currentQuestion.text}</h2>

            {currentQuestion.type === 'YES_NO' && (
              <div className="space-y-2">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  answers[currentQuestion._id] === 'yes' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name={`question-${currentQuestion._id}`}
                    value="yes"
                    checked={answers[currentQuestion._id] === 'yes'}
                    onChange={() => handleAnswer(currentQuestion._id, 'yes')}
                    className="mr-3 w-5 h-5 text-green-600"
                  />
                  <span className="text-lg font-medium">Yes</span>
                </label>
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  answers[currentQuestion._id] === 'no' 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name={`question-${currentQuestion._id}`}
                    value="no"
                    checked={answers[currentQuestion._id] === 'no'}
                    onChange={() => handleAnswer(currentQuestion._id, 'no')}
                    className="mr-3 w-5 h-5 text-red-600"
                  />
                  <span className="text-lg font-medium">No</span>
                </label>
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  answers[currentQuestion._id] === 'not_applicable' 
                    ? 'border-gray-500 bg-gray-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name={`question-${currentQuestion._id}`}
                    value="not_applicable"
                    checked={answers[currentQuestion._id] === 'not_applicable'}
                    onChange={() => handleAnswer(currentQuestion._id, 'not_applicable')}
                    className="mr-3 w-5 h-5 text-gray-600"
                  />
                  <span className="text-lg font-medium">Not Applicable</span>
                </label>
              </div>
            )}

            {currentQuestion.type === 'SINGLE_CHOICE' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion._id}`}
                      value={option.value}
                      checked={answers[currentQuestion._id] === option.value}
                      onChange={() => handleAnswer(currentQuestion._id, option.value)}
                      className="mr-3"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={(answers[currentQuestion._id] || []).includes(option.value)}
                      onChange={(e) => {
                        const current = answers[currentQuestion._id] || [];
                        const updated = e.target.checked
                          ? [...current, option.value]
                          : current.filter((v: string) => v !== option.value);
                        handleAnswer(currentQuestion._id, updated);
                      }}
                      className="mr-3"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'TEXT' && (
              <textarea
                value={answers[currentQuestion._id] || ''}
                onChange={(e) => handleAnswer(currentQuestion._id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
              />
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || !acknowledgedDisclaimer}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Next
              </button>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

