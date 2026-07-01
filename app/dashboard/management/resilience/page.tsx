import { redirect } from 'next/navigation';

export default function ResilienceManagementPage() {
  redirect('/dashboard/gap-analysis?pillar=RESILIENCE_TESTING');
}
