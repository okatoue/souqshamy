// lib/imageUtils.ts

/**
 * Converts a Supabase Storage image URL to a thumbnail URL with lower resolution
 * Supabase Storage supports image transformations via the render endpoint
 * 
 * @param imageUrl - The original image URL from Supabase Storage
 * @param width - Desired width (default: 200)
 * @param height - Desired height (default: 200)
 * @param quality - Image quality 1-100 (default: 60)
 * @returns Transformed thumbnail URL or original URL if transformation not possible
 */
export function getThumbnailUrl(
    imageUrl: string,
    width: number = 200,
    height: number = 200,
    quality: number = 60
): string {
    if (!imageUrl) return imageUrl;

    try {
        // Check if it's a Supabase Storage URL
        // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
        if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
            // Transform to render endpoint for image transformations
            // New format: https://[project].supabase.co/storage/v1/render/image/public/[bucket]/[path]?width=X&height=Y&quality=Z
            const transformedUrl = imageUrl.replace(
                '/storage/v1/object/public/',
                '/storage/v1/render/image/public/'
            );
            return `${transformedUrl}?width=${width}&height=${height}&quality=${quality}&resize=cover`;
        }

        // Return original URL if not a Supabase Storage URL
        return imageUrl;
    } catch (error) {
        console.error('Error generating thumbnail URL:', error);
        return imageUrl;
    }
}

/**
 * Get full resolution image URL (for detail pages)
 * This simply returns the original URL
 */
export function getFullResolutionUrl(imageUrl: string): string {
    return imageUrl;
}