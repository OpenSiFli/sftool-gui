import { i18n } from '../i18n';

// Helper for non-component modules to access translations
export const t = (key: string, params: Record<string, unknown> = {}) => {
  try {
    return i18n.global.t(key, params) as string;
  } catch (e) {
    return key;
  }
};

export default { t };
