import { router, useLocalSearchParams } from 'expo-router';

import { useIsWide } from '@/components/ds';
import { CommunitySplit } from '@/features/communities/components/CommunitySplit';
import { Departures } from '@/features/communities/components/Departures';

/** Communities tab. Phone: the departures board. Desktop: board + the selected crew. */
export default function CommunitiesTab() {
  const wide = useIsWide();
  const { c } = useLocalSearchParams<{ c?: string }>();
  if (wide) {
    return (
      <CommunitySplit
        selectedSlug={c ?? null}
        onSelect={(slug) => router.replace(`/communities?c=${slug}`)}
      />
    );
  }
  return <Departures onOpen={(slug) => router.push(`/community/${slug}`)} />;
}
