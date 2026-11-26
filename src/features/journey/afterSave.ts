import { router } from 'expo-router';

import { registerForPush } from '@/lib/notifications';

import type { MilestoneFormValues } from './rules';

/**
 * After saving: if it has a reminder, ask for notification permission now (in
 * context, not at launch), then open the milestone.
 */
export async function afterSave(id: string, values: MilestoneFormValues) {
  if (values.status === 'upcoming' && values.remindOn) await registerForPush({ ask: true });
  router.replace(`/journey/${id}`);
}
