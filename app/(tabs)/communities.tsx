import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/features/shared/ComingSoon';

export default function CommunitiesTab() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t('tabsPlaceholder.communities')}
      body={t('tabsPlaceholder.communitiesBody')}
      stamp={t('common.soon')}
      icon="communities"
    />
  );
}
