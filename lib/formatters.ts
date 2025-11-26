/**
 * Shared formatting utilities for the SouqShamy marketplace app.
 * Consolidates duplicated formatting functions from across the codebase.
 */

import categoriesData from '@/assets/categories.json';

// ============================================================================
// Date Formatting
// ============================================================================

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

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
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

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffInHours < 24) {
        return timeStr;
    } else if (diffInHours < 48) {
        return `Yesterday ${timeStr}`;
    }
    return `${date.toLocaleDateString()} ${timeStr}`;
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
 * @param categoryId - The main category ID
 * @param subcategoryId - The subcategory ID
 * @returns Object containing category name, icon, and subcategory name
 */
export function getCategoryInfo(categoryId: number, subcategoryId: number): CategoryInfo {
    const category = categoriesData.categories.find(c => c.id === categoryId);
    const subcategory = category?.subcategories.find(s => s.id === subcategoryId);

    return {
        categoryName: category?.name || 'Unknown',
        categoryIcon: category?.icon || '📦',
        subcategoryName: subcategory?.name || ''
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
}

/**
 * Gets the display name for a user with a fallback chain.
 * Priority: display_name -> email (if not numeric) -> phone_number -> 'User'
 * @param profile - User profile object
 * @returns The best available display name
 */
export function getDisplayName(profile: UserProfile | null | undefined): string {
    if (!profile) return 'User';

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

    return 'User';
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
