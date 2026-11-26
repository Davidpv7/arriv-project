import { router, useLocalSearchParams } from 'expo-router';

import { useIsWide } from '@/components/ds';
import { ChatSplit } from '@/features/chat/components/ChatSplit';
import { ConversationView } from '@/features/chat/components/ConversationView';

/** One chat. On desktop it opens beside the inbox (two panes), wherever it was opened from. */
export default function ConversationScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const wide = useIsWide();
  if (wide)
    return (
      <ChatSplit selectedId={id} onSelect={(next) => router.replace(`/conversation/${next}`)} />
    );
  return <ConversationView id={id} />;
}
