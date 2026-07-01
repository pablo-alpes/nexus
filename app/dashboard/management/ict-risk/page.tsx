import { redirect } from 'next/navigation';

export default function ICTRiskManagementPage() {
  redirect('/dashboard/gap-analysis?pillar=ICT_RISK_MANAGEMENT');
}
