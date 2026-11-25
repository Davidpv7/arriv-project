import { Redirect } from 'expo-router';

// Phase 0: the app opens on the design-system screen.
// Phase 1 replaces this with the auth gate (welcome / onboarding / tabs).
export default function Index() {
  return <Redirect href="/ds" />;
}
