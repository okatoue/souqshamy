/**
 * Category assets mapping for the SouqJari marketplace app.
 * This file consolidates category icon imports to maintain a single source of truth.
 *
 * When adding a new category:
 * 1. Add the icon to assets/images/
 * 2. Import it here
 * 3. Add it to CATEGORY_ICONS with the matching category ID from categories.json
 */

import { ImageSourcePropType } from 'react-native';

// Import category icons
import BuyAndSellIcon from '@/assets/images/BuyAndSell.png';
import CarsIcon from '@/assets/images/Cars.png';
import JobsIcon from '@/assets/images/Jobs.png';
import PetsIcon from '@/assets/images/Pets.png';
import RealEstateIcon from '@/assets/images/RealEstate.png';
import ServicesIcon from '@/assets/images/Services.png';

/**
 * Map of category IDs to their icon images.
 * IDs match the category IDs in categories.json
 */
export const CATEGORY_ICONS: Record<number, ImageSourcePropType> = {
    1: BuyAndSellIcon,   // Buy & Sell
    2: CarsIcon,         // Cars
    3: RealEstateIcon,   // Real Estate
    4: JobsIcon,         // Jobs
    5: ServicesIcon,     // Services
    6: PetsIcon,         // Pets
};

/**
 * Get the icon for a category by its ID.
 *
 * @param categoryId - The category ID from categories.json
 * @returns The icon image source, or null if not found
 */
export function getCategoryIcon(categoryId: number): ImageSourcePropType | null {
    return CATEGORY_ICONS[categoryId] || null;
}

/**
 * Check if a category has an icon defined.
 *
 * @param categoryId - The category ID to check
 * @returns true if the category has an icon, false otherwise
 */
export function hasCategoryIcon(categoryId: number): boolean {
    return categoryId in CATEGORY_ICONS;
}
