import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/session';
import { useMyProfile } from '@/features/profile/api';

/** Entry point: sends each person to Welcome, onboarding or Home. */
export default function Index() {
  const { session } = useSession();
  const profile = useMyProfile();

  if (!session) return <Redirect href="/welcome" />;
  if (!profile.data) return null; // root layout keeps the splash up until this loads
  if (!profile.data.onboarded_at) return <Redirect href="/origin" />;
  return <Redirect href="/home" />;
}
