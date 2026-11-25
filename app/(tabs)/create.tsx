import { Redirect } from 'expo-router';

// The ＋ tab opens the composer as a modal (see the tab bar). This route only exists
// so the tab has a screen; reaching it directly also opens the composer.
export default function CreateTab() {
  return <Redirect href="/compose" />;
}
