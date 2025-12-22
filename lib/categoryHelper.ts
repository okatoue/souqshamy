// Category helper functions for bilingual category names
import { getCurrentLanguage } from '@/localization';
import { SupportedLanguage } from '@/localization/languageDetector';

// Type definitions for bilingual categories
export interface BilingualName {
  en: string;
  ar: string;
}

export interface BilingualSubcategory {
  id: number;
  name: BilingualName;
}

export interface BilingualCategory {
  id: number;
  name: BilingualName;
  icon: string;
  subcategories: BilingualSubcategory[];
}

export interface BilingualCategoriesData {
  categories: BilingualCategory[];
}

// Legacy category types for backward compatibility
export interface LegacySubcategory {
  id: number;
  name: string;
}

export interface LegacyCategory {
  id: number;
  name: string;
  icon: string;
  subcategories: LegacySubcategory[];
}

// Union type for categories that could be in either format
export type CategoryName = string | BilingualName;

/**
 * Check if a name is bilingual (has 'en' and 'ar' properties)
 */
export function isBilingualName(name: CategoryName): name is BilingualName {
  return typeof name === 'object' && 'en' in name && 'ar' in name;
}

/**
 * Get the localized category name based on current language
 */
export function getCategoryName(
  name: CategoryName,
  language?: SupportedLanguage
): string {
  const lang = language || (getCurrentLanguage() as SupportedLanguage);

  if (isBilingualName(name)) {
    return name[lang] || name.en; // Fallback to English if translation missing
  }

  // If it's a simple string, return as-is (legacy format)
  return name;
}

/**
 * Get the localized subcategory name based on current language
 */
export function getSubcategoryName(
  name: CategoryName,
  language?: SupportedLanguage
): string {
  return getCategoryName(name, language);
}

/**
 * Find a category by ID and return its localized name
 */
export function getCategoryNameById(
  categories: (BilingualCategory | LegacyCategory)[],
  categoryId: number,
  language?: SupportedLanguage
): string | undefined {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return undefined;
  return getCategoryName(category.name as CategoryName, language);
}

/**
 * Find a subcategory by ID and return its localized name
 */
export function getSubcategoryNameById(
  categories: (BilingualCategory | LegacyCategory)[],
  subcategoryId: number,
  language?: SupportedLanguage
): string | undefined {
  for (const category of categories) {
    const subcategory = category.subcategories.find((s) => s.id === subcategoryId);
    if (subcategory) {
      return getSubcategoryName(subcategory.name as CategoryName, language);
    }
  }
  return undefined;
}

/**
 * Get parent category for a subcategory ID
 */
export function getParentCategory(
  categories: (BilingualCategory | LegacyCategory)[],
  subcategoryId: number
): BilingualCategory | LegacyCategory | undefined {
  return categories.find((category) =>
    category.subcategories.some((sub) => sub.id === subcategoryId)
  );
}

/**
 * Get localized category and subcategory names for a listing
 */
export function getListingCategoryNames(
  categories: (BilingualCategory | LegacyCategory)[],
  categoryId: number,
  subcategoryId: number,
  language?: SupportedLanguage
): { categoryName: string; subcategoryName: string } | undefined {
  const categoryName = getCategoryNameById(categories, categoryId, language);
  const subcategoryName = getSubcategoryNameById(categories, subcategoryId, language);

  if (!categoryName || !subcategoryName) return undefined;

  return { categoryName, subcategoryName };
}

/**
 * Transform legacy categories to bilingual format
 * Useful for migrating old category data
 */
export function toBilingualCategories(
  legacyCategories: LegacyCategory[],
  arabicTranslations: Record<string, string>
): BilingualCategory[] {
  return legacyCategories.map((category) => ({
    id: category.id,
    name: {
      en: category.name,
      ar: arabicTranslations[category.name] || category.name,
    },
    icon: category.icon,
    subcategories: category.subcategories.map((sub) => ({
      id: sub.id,
      name: {
        en: sub.name,
        ar: arabicTranslations[sub.name] || sub.name,
      },
    })),
  }));
}
