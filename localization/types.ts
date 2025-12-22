// Translation keys type definition for type-safe translations

export interface CommonTranslations {
  loading: string;
  error: string;
  retry: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  search: string;
  noResults: string;
  confirm: string;
  yes: string;
  no: string;
  ok: string;
}

export interface TranslationKeys {
  common: CommonTranslations;
}

// Type for accessing nested translation keys with dot notation
export type TranslationKeyPath =
  | `common.${keyof CommonTranslations}`;
