import { router, useLocalSearchParams } from 'expo-router';

import { useIsWide } from '@/components/ds';
import { CommunitySplit } from '@/features/communities/components/CommunitySplit';
import { CommunityView } from '@/features/communities/components/CommunityView';

/** One crew. On desktop it opens beside the departures board, wherever it was opened from. */
export default function CommunityScreen() {
  const { slug = '' } = useLocalSearchParams<{ slug: string }>();
  const wide = useIsWide();
  if (wide) {
    return (
      <CommunitySplit
        selectedSlug={slug}
        onSelect={(next) => router.replace(`/community/${next}`)}
      />
    );
  }
  return <CommunityView slug={slug} />;
}
