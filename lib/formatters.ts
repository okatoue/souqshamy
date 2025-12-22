/**
 * Shared formatting utilities for the SouqShamy marketplace app.
 * Consolidates duplicated formatting functions from across the codebase.
 */

import categoriesData from '@/assets/categories.json';
import { getCategoryName as getLocalizedCategoryName, getSubcategoryName as getLocalizedSubcategoryName } from '@/lib/categoryHelper';
import { getCurrentLanguage, isCurrentLanguageRTL } from '@/localization';

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Gets the locale string for formatting based on current language.
 */
function getLocale(): string {
    const lang = getCurrentLanguage();
    return lang === 'ar' ? 'ar-SY' : 'en-US';
}

/**
 * Formats a date string into a human-readable relative time format.
 * @param dateString - ISO date string to format
 * @returns Formatted string like "Just now", "5m ago", "2h ago", "3d ago", or locale date
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const lang = getCurrentLanguage();

    if (lang === 'ar') {
        if (diffInMinutes < 1) return 'الآن';
        if (diffInMinutes < 60) return `منذ ${diffInMinutes} د`;
        if (diffInHours < 24) return `منذ ${diffInHours} س`;
        if (diffInHours < 168) return `منذ ${Math.floor(diffInHours / 24)} ي`;
        return date.toLocaleDateString('ar-SY');
    }

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString('en-US');
}

/**
 * Formats a date string for chat messages with time display.
 * @param dateString - ISO date string to format
 * @returns Formatted string with time (e.g., "2:30 PM", "Yesterday 2:30 PM")
 */
export function formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const locale = getLocale();
    const lang = getCurrentLanguage();

    const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    if (diffInHours < 24) {
        return timeStr;
    } else if (diffInHours < 48) {
        return lang === 'ar' ? `أمس ${timeStr}` : `Yesterday ${timeStr}`;
    }
    return `${date.toLocaleDateString(locale)} ${timeStr}`;
}

// ============================================================================
// Price Formatting
// ============================================================================

/**
 * Formats a price with the appropriate currency symbol.
 * @param price - The numeric price value
 * @param currency - Currency code ('SYP' or 'USD')
 * @returns Formatted price string (e.g., "£1,000" or "USD 1,000")
 */
export function formatPrice(price: number, currency: string): string {
    const formattedNumber = price.toLocaleString();
    if (currency === 'SYP') {
        return `£${formattedNumber}`;
    }
    return `USD ${formattedNumber}`;
}

/**
 * Formats a number string with thousand separators for display.
 * @param value - Raw number string (e.g., "1000000")
 * @returns Formatted string (e.g., "1,000,000")
 */
export function formatPriceInput(value: string): string {
    // Remove any existing commas and non-numeric chars except decimal
    const cleanValue = value.replace(/[^0-9.]/g, '');

    // Split by decimal point
    const parts = cleanValue.split('.');

    // Format integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Rejoin with decimal if exists
    return parts.join('.');
}

/**
 * Removes formatting to get raw number for storage.
 * @param formattedValue - Formatted string (e.g., "1,000,000")
 * @returns Raw number string (e.g., "1000000")
 */
export function unformatPrice(formattedValue: string): string {
    return formattedValue.replace(/,/g, '');
}

// ============================================================================
// Category Utilities
// ============================================================================

export interface CategoryInfo {
    categoryName: string;
    categoryIcon: string;
    subcategoryName: string;
}

/**
 * Gets category and subcategory information by their IDs.
 * Uses localized names based on current language.
 * @param categoryId - The main category ID
 * @param subcategoryId - The subcategory ID
 * @returns Object containing category name, icon, and subcategory name
 */
export function getCategoryInfo(categoryId: number, subcategoryId: number): CategoryInfo {
    const category = categoriesData.categories.find(c => c.id === categoryId);
    const subcategory = category?.subcategories.find(s => s.id === subcategoryId);
    const lang = getCurrentLanguage();

    return {
        categoryName: category ? getLocalizedCategoryName(category.name) : (lang === 'ar' ? 'غير معروف' : 'Unknown'),
        categoryIcon: category?.icon || '📦',
        subcategoryName: subcategory ? getLocalizedSubcategoryName(subcategory.name) : ''
    };
}

/**
 * Gets the full category display string.
 * @param categoryId - The main category ID
 * @param subcategoryId - The subcategory ID
 * @param separator - Separator between category and subcategory (default: ' › ')
 * @returns Formatted string like "Buy & Sell › Electronics"
 */
export function getCategoryDisplayString(
    categoryId: number,
    subcategoryId: number,
    separator: string = ' › '
): string {
    const { categoryName, subcategoryName } = getCategoryInfo(categoryId, subcategoryId);
    if (subcategoryName) {
        return `${categoryName}${separator}${subcategoryName}`;
    }
    return categoryName;
}

// ============================================================================
// User Display Name Utilities
// ============================================================================

export interface UserProfile {
    id: string;
    display_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    avatar_url?: string | null;
    created_at?: string | null;
}

/**
 * Gets the display name for a user with a fallback chain.
 * Priority: display_name -> email (if not numeric) -> phone_number -> 'User'
 * @param profile - User profile object
 * @returns The best available display name
 */
export function getDisplayName(profile: UserProfile | null | undefined): string {
    const lang = getCurrentLanguage();
    const defaultUser = lang === 'ar' ? 'مستخدم' : 'User';

    if (!profile) return defaultUser;

    if (profile.display_name) {
        return profile.display_name;
    }

    if (profile.email) {
        const emailName = profile.email.split('@')[0];
        // Don't use numeric-only email prefixes as display names
        if (!emailName.match(/^\d+$/)) {
            return emailName;
        }
    }

    if (profile.phone_number) {
        return profile.phone_number;
    }

    return defaultUser;
}

// ============================================================================
// Text Utilities
// ============================================================================

/**
 * Truncates text to a maximum length with ellipsis.
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with '...' if needed
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Formats a date into a human-readable relative time string.
 * Uses friendly terms like "today", "yesterday", "2 weeks ago", "over a month ago".
 * @param dateString - ISO date string to format
 * @returns Formatted string like "today", "3 days ago", "over a month ago"
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    const lang = getCurrentLanguage();

    if (lang === 'ar') {
        if (diffInMinutes < 60) return 'اليوم';
        if (diffInHours < 24) return 'اليوم';
        if (diffInDays === 1) return 'أمس';
        if (diffInDays < 7) return `منذ ${diffInDays} أيام`;
        if (diffInWeeks === 1) return 'منذ أسبوع';
        if (diffInWeeks < 4) return `منذ ${diffInWeeks} أسابيع`;
        if (diffInMonths === 1) return 'منذ أكثر من شهر';
        if (diffInMonths < 12) return `منذ ${diffInMonths} أشهر`;
        if (diffInYears === 1) return 'منذ أكثر من سنة';
        return `منذ ${diffInYears} سنوات`;
    }

    if (diffInMinutes < 60) return 'today';
    if (diffInHours < 24) return 'today';
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInWeeks === 1) return '1 week ago';
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
    if (diffInMonths === 1) return 'over a month ago';
    if (diffInMonths < 12) return `${diffInMonths} months ago`;
    if (diffInYears === 1) return 'over a year ago';
    return `${diffInYears} years ago`;
}

/**
 * Calculates years since a date (e.g., for "X years on platform").
 * @param dateString - ISO date string
 * @returns Number of years (minimum 1 if less than a year)
 */
export function getYearsSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInYears = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365));
    return Math.max(1, diffInYears); // Minimum 1 year for display
}

/**
 * Gets a human-readable string for time on platform.
 * @param dateString - ISO date string of when user joined
 * @returns Formatted string like "5 days on SouqJari", "3 months on SouqJari", "2 yrs on SouqJari"
 */
export function getTimeOnPlatform(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const lang = getCurrentLanguage();

    if (lang === 'ar') {
        if (diffInDays < 30) {
            const days = Math.max(1, diffInDays);
            return `${days} ${days === 1 ? 'يوم' : 'أيام'} على سوق جاري`;
        } else if (diffInDays < 365) {
            const months = Math.floor(diffInDays / 30);
            return `${months} ${months === 1 ? 'شهر' : 'أشهر'} على سوق جاري`;
        } else {
            const years = Math.floor(diffInDays / 365);
            return `${years} ${years === 1 ? 'سنة' : 'سنوات'} على سوق جاري`;
        }
    }

    if (diffInDays < 30) {
        return `${Math.max(1, diffInDays)} ${diffInDays === 1 ? 'day' : 'days'} on SouqJari`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} on SouqJari`;
    } else {
        const years = Math.floor(diffInDays / 365);
        return `${years} ${years === 1 ? 'yr' : 'yrs'} on SouqJari`;
    }
}

/**
 * Formats a file size in bytes to a human-readable string.
 * @param bytes - File size in bytes
 * @returns Formatted string like "1.5 MB" or "500 KB"
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Formats a duration in seconds to mm:ss format.
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1:30" or "0:45"
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
