// lib/imageUpload.ts
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const LISTING_IMAGES_BUCKET = 'listing-images';

/**
 * Uploads a single image to Supabase Storage
 * @param uri - Local file URI (e.g., file:///...)
 * @param userId - User ID for organizing files
 * @returns Public URL of the uploaded image
 */
async function uploadSingleImage(uri: string, userId: string): Promise<string> {
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    // Determine file extension from URI
    const uriParts = uri.split('.');
    const extension = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';

    // Map common extensions to MIME types
    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'heic': 'image/heic',
    };
    const contentType = mimeTypes[extension] || 'image/jpeg';

    // Generate unique filename: userId/timestamp_random.extension
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${userId}/${timestamp}_${randomId}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .upload(filename, decode(base64), {
            contentType,
            upsert: false,
        });

    if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .getPublicUrl(uploadData.path);

    return urlData.publicUrl;
}

/**
 * Uploads multiple images to Supabase Storage
 * @param uris - Array of local file URIs
 * @param userId - User ID for organizing files
 * @returns Array of public URLs for the uploaded images
 */
export async function uploadListingImages(
    uris: string[],
    userId: string
): Promise<string[]> {
    if (!uris || uris.length === 0) {
        return [];
    }

    const uploadPromises = uris.map(uri => uploadSingleImage(uri, userId));

    try {
        const publicUrls = await Promise.all(uploadPromises);
        console.log(`Successfully uploaded ${publicUrls.length} images`);
        return publicUrls;
    } catch (error) {
        console.error('Error uploading listing images:', error);
        throw error;
    }
}
