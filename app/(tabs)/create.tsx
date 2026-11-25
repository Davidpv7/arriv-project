import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/features/shared/ComingSoon';

export default function CreateTab() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t('tabsPlaceholder.create')}
      body={t('tabsPlaceholder.createBody')}
      stamp={t('common.soon')}
      icon="plus"
    />
  );
}
