import { router, type Href } from 'expo-router';

import { registerForPush } from '@/lib/notifications';

import type { MilestoneFormValues } from './rules';

/**
 * Should the milestone page ask "Add your dates to the visa stats?" A visa with a
 * lodged date and subclass that isn't shared yet. Asked once, right after saving.
 */
export const shouldAskStats = (v: MilestoneFormValues) =>
  v.kind === 'visa' && v.status !== 'upcoming' && !!v.lodgedOn && !!v.visaSubclass && !v.shareStats;

/** The milestone page to open after adding a stamp in the wizard. */
export const savedPath = (id: string, v: MilestoneFormValues): Href =>
  shouldAskStats(v)
    ? { pathname: '/journey/[id]', params: { id, askStats: '1' } }
    : { pathname: '/journey/[id]', params: { id } };

/**
 * After editing: if it has a reminder, ask for notification permission now (in
 * context, not at launch), then open the milestone. (The edit form has its own
 * visa stats switch, so it doesn't ask about stats again.)
 */
export async function afterSave(id: string, values: MilestoneFormValues) {
  if (values.status === 'upcoming' && values.remindOn) await registerForPush({ ask: true });
  router.replace(`/journey/${id}`);
}
