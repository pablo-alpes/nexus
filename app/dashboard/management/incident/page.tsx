import { redirect } from 'next/navigation';

export default function IncidentManagementPage() {
  redirect('/dashboard/gap-analysis?pillar=INCIDENT_MANAGEMENT');
}
