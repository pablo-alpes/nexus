import { redirect } from 'next/navigation';

export default function InformationSharingManagementPage() {
  redirect('/dashboard/gap-analysis?pillar=INFORMATION_SHARING');
}
