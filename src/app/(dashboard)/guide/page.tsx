import { requireStaff } from '@/lib/auth';
import { PageHeader } from '@/components/shared/page-header';
import { GuideContent } from './guide-content';

export default async function GuidePage() {
  await requireStaff('viewer');
  return (
    <div>
      <PageHeader title="Οδηγός χρήσης" description="Πώς δουλεύει κάθε σελίδα του dashboard, βήμα-βήμα. Χρησιμοποίησε την αναζήτηση ή το μενού για να βρεις γρήγορα αυτό που ψάχνεις." />
      <GuideContent />
    </div>
  );
}
