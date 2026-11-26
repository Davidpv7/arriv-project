import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/ds';
import type { BackpackDocument } from '@/features/backpack/api';
import { isImageDocument, sizeLabel, typeLabel } from '@/features/backpack/rules';
import { relativeTime } from '@/features/feed/format';

type Props = {
  doc: BackpackDocument;
  /** Shown before the type, e.g. the folder on the recent list. */
  context?: string;
  onPress: () => void;
};

/** One line of the baggage receipt: name, then type · size · date. Never a preview. */
export function DocumentRow({ doc, context, onPress }: Props) {
  const { t } = useTranslation();
  const meta = t('backpack.docMeta', {
    type: typeLabel(doc.mime_type),
    size: sizeLabel(doc.size_bytes),
    date: relativeTime(t, doc.created_at),
  });
  const full = context ? `${context} · ${meta}` : meta;
  return (
    <ListRow
      icon={isImageDocument(doc.mime_type) ? 'image' : 'document'}
      title={doc.name}
      meta={full}
      onPress={onPress}
      accessibilityLabel={t('backpack.docA11y', { name: doc.name, meta: full })}
    />
  );
}
