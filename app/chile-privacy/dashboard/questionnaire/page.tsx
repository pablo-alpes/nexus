'use client';

/**
 * Chilean Privacy Questionnaire Page
 * Route: /chile-privacy/dashboard/questionnaire
 */

import { usePathname } from 'next/navigation';
import QuestionnairePage from '@/app/dashboard/questionnaire/page';

export default function ChileanPrivacyQuestionnaire() {
  return <QuestionnairePage />;
}
