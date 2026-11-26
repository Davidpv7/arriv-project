import { LegalDocument } from '@/features/legal/LegalDocument';

/** Public page (no sign-in): the stores link to it. */
export default function TermsPage() {
  return <LegalDocument doc="terms" />;
}
