import { router, useLocalSearchParams } from 'expo-router';

import { useIsWide } from '@/components/ds';
import { ChatSplit } from '@/features/chat/components/ChatSplit';
import { Inbox } from '@/features/chat/components/Inbox';

/** Chat tab. Phone: the inbox (a chat opens on its own screen). Desktop: inbox + open chat. */
export default function ChatTab() {
  const wide = useIsWide();
  const { c } = useLocalSearchParams<{ c?: string }>();
  if (wide) {
    return <ChatSplit selectedId={c ?? null} onSelect={(id) => router.replace(`/chat?c=${id}`)} />;
  }
  return <Inbox onOpen={(id) => router.push(`/conversation/${id}`)} />;
}
