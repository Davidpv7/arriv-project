import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';

/**
 * Zod schemas and API helpers return i18n keys as error messages.
 * This turns such a key into display text (undefined stays undefined).
 */
export function useErrorText() {
  const { t } = useTranslation();
  return (key: string | undefined) => (key ? t(key as ParseKeys) : undefined);
}
