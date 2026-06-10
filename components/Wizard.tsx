'use client';

/**
 * Generic Wizard Component
 * Interactive step-by-step wizard for data collection
 */

import { useState, ReactNode } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';

type StepComponentProps = {
  data: any;
  updateData: (data: any) => void;
  allData: any;
};

type StepComponent = ReactNode | ((props: StepComponentProps) => ReactNode);

interface WizardStep {
  id: string;
  title: string;
  titleEs?: string;
  description?: string;
  descriptionEs?: string;
  component: StepComponent;
  validation?: () => boolean;
}

interface WizardProps {
  steps: WizardStep[];
  onComplete: (data: any) => void;
  onCancel?: () => void;
  title?: string;
  titleEs?: string;
}

export default function Wizard({ steps, onComplete, onCancel, title, titleEs }: WizardProps) {
  const { language } = useTranslation();
  const isSpanish = language === 'es';
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    // Validate current step if validation function exists
    if (currentStepData.validation && !currentStepData.validation()) {
      setErrors({ [currentStepData.id]: isSpanish ? 'Por favor complete todos los campos requeridos' : 'Please complete all required fields' });
      return;
    }

    setErrors({});
    if (isLastStep) {
      onComplete(formData);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const updateFormData = (stepId: string, data: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [stepId]: { ...prev[stepId], ...data },
    }));
  };

  const getStepData = (stepId: string) => {
    return formData[stepId] || {};
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {title ? (isSpanish && titleEs ? titleEs : title) : (isSpanish && currentStepData.titleEs ? currentStepData.titleEs : currentStepData.title)}
            </h2>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 text-center ${
                  index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                    index < currentStep
                      ? 'bg-blue-600 text-white'
                      : index === currentStep
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <p className="text-xs mt-1 hidden md:block">
                  {isSpanish && step.titleEs ? step.titleEs : step.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {currentStepData.description && (
            <p className="text-gray-600 mb-4">
              {isSpanish && currentStepData.descriptionEs ? currentStepData.descriptionEs : currentStepData.description}
            </p>
          )}

          {errors[currentStepData.id] && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors[currentStepData.id]}
            </div>
          )}

          {/* Render step component with data and update function */}
          <div className="min-h-[300px]">
            {typeof currentStepData.component === 'function'
              ? (currentStepData.component as (props: StepComponentProps) => ReactNode)({
                  data: getStepData(currentStepData.id),
                  updateData: (data: any) => updateFormData(currentStepData.id, data),
                  allData: formData,
                })
              : currentStepData.component}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`px-4 py-2 rounded-lg ${
              isFirstStep
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isSpanish ? '← Anterior' : '← Previous'}
          </button>

          <div className="text-sm text-gray-500 flex items-center">
            {isSpanish ? 'Paso' : 'Step'} {currentStep + 1} {isSpanish ? 'de' : 'of'} {steps.length}
          </div>

          <button
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isLastStep
              ? (isSpanish ? 'Completar' : 'Complete')
              : (isSpanish ? 'Siguiente →' : 'Next →')}
          </button>
        </div>
      </div>
    </div>
  );
}
