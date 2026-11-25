import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/features/shared/ComingSoon';

export default function ChatTab() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t('tabsPlaceholder.chat')}
      body={t('tabsPlaceholder.chatBody')}
      stamp={t('common.soon')}
      icon="chat"
    />
  );
}
