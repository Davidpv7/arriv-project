import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/features/shared/ComingSoon';

export default function BackpackTab() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t('tabsPlaceholder.backpack')}
      body={t('tabsPlaceholder.backpackBody')}
      stamp={t('common.soon')}
      icon="backpack"
    />
  );
}
