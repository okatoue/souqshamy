import { TFunction } from 'i18next';

// Map category IDs to translation keys
const CATEGORY_KEYS: Record<number, string> = {
  1: 'categories.buySell',
  2: 'categories.cars',
  3: 'categories.realEstate',
  4: 'categories.jobs',
  5: 'categories.services',
  6: 'categories.pets',
};

// Map subcategory IDs to translation keys
const SUBCATEGORY_KEYS: Record<number, string> = {
  // Buy & Sell subcategories (category 1)
  1: 'categories.electronics',
  2: 'categories.furniture',
  3: 'categories.clothing',
  4: 'categories.books',
  5: 'categories.phones',
  6: 'categories.computers',
  7: 'categories.homeAppliances',
  8: 'categories.toysGames',
  9: 'categories.sportsEquipment',
  10: 'categories.other',
  // Cars subcategories (category 2)
  11: 'categories.carsTrucks',
  12: 'categories.motorcycles',
  13: 'categories.vehicleParts',
  14: 'categories.other',
  // Real Estate subcategories (category 3)
  15: 'categories.forRent',
  16: 'categories.forSale',
  // Jobs subcategories (category 4)
  17: 'categories.accounting',
  18: 'categories.customerService',
  19: 'categories.healthcare',
  20: 'categories.sales',
  21: 'categories.itProgramming',
  22: 'categories.other',
  // Services subcategories (category 5)
  23: 'categories.homeMaintenance',
  24: 'categories.tutoring',
  25: 'categories.cleaning',
  26: 'categories.moving',
  27: 'categories.other',
  // Pets subcategories (category 6)
  28: 'categories.cats',
  29: 'categories.dogs',
  30: 'categories.birds',
  31: 'categories.other',
};

/**
 * Get translated category name by category ID
 * @param categoryId - The numeric category ID from categories.json
 * @param t - The i18next translation function
 * @returns Translated category name
 */
export function getCategoryTranslation(categoryId: number, t: TFunction): string {
  const key = CATEGORY_KEYS[categoryId];
  return key ? t(key) : 'Unknown';
}

/**
 * Get translated subcategory name by subcategory ID
 * @param subcategoryId - The numeric subcategory ID from categories.json
 * @param t - The i18next translation function
 * @returns Translated subcategory name
 */
export function getSubcategoryTranslation(subcategoryId: number, t: TFunction): string {
  const key = SUBCATEGORY_KEYS[subcategoryId];
  return key ? t(key) : 'Unknown';
}
