// lib/imageUpload.ts
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const LISTINGS_BUCKET = 'listing-images';

/**
 * Uploads an image to Supabase Storage and returns the public URL
 * @param localUri - Local file URI (file:// or content://)
 * @param userId - User ID for organizing uploads
 * @param listingId - Optional listing ID (use timestamp for new listings)
 * @returns Public URL of the uploaded image, or null if upload fails
 */
export async function uploadListingImage(
  localUri: string,
  userId: string,
  listingId?: string
): Promise<string | null> {
  try {
    // Skip if already a remote URL (Supabase or other https URL)
    if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
      return localUri;
    }

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine file extension from URI
    const extension = getFileExtension(localUri);
    const contentType = getContentType(extension);

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${userId}/${listingId || 'new'}_${timestamp}_${randomId}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(LISTINGS_BUCKET)
      .upload(filename, decode(base64), {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('[imageUpload] Upload failed:', error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(LISTINGS_BUCKET)
      .getPublicUrl(data.path);

    console.log('[imageUpload] Uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('[imageUpload] Error uploading image:', error);
    return null;
  }
}

/**
 * Uploads multiple images and returns their public URLs
 * @param localUris - Array of local file URIs
 * @param userId - User ID for organizing uploads
 * @returns Array of public URLs (filters out failed uploads)
 */
export async function uploadListingImages(
  localUris: string[],
  userId: string
): Promise<string[]> {
  const uploadPromises = localUris.map((uri) => uploadListingImage(uri, userId));
  const results = await Promise.all(uploadPromises);

  // Filter out null results (failed uploads)
  return results.filter((url): url is string => url !== null);
}

/**
 * Extract file extension from URI
 */
function getFileExtension(uri: string): string {
  // Try to get extension from URI
  const match = uri.match(/\.(\w+)(?:\?|$)/);
  if (match) {
    return match[1].toLowerCase();
  }
  // Default to jpg for images
  return 'jpg';
}

/**
 * Get content type from file extension
 */
function getContentType(extension: string): string {
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return types[extension] || 'image/jpeg';
}
