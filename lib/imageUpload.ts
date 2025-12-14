// lib/imageUpload.ts
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const LISTING_IMAGES_BUCKET = 'listing-images';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const UPLOAD_TIMEOUT_MS = 60000; // 60 second timeout per upload

/**
 * Delays execution for specified milliseconds
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        promise
            .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

/**
 * Tests network connectivity to the Supabase storage endpoint
 */
async function testStorageConnectivity(): Promise<{ reachable: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
        // Use listBuckets as a lightweight connectivity test
        const { data, error } = await withTimeout(
            supabase.storage.listBuckets(),
            10000, // 10 second timeout for connectivity test
            'Storage connectivity test'
        );
        const latencyMs = Date.now() - startTime;

        if (error) {
            return { reachable: false, latencyMs, error: error.message };
        }

        return { reachable: true, latencyMs };
    } catch (e) {
        const latencyMs = Date.now() - startTime;
        return { reachable: false, latencyMs, error: String(e) };
    }
}

/**
 * Checks if the storage bucket exists and provides diagnostic info
 */
async function checkBucketExists(): Promise<{ exists: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
            return { exists: false, error: error.message };
        }
        const bucketExists = data?.some(b => b.id === LISTING_IMAGES_BUCKET || b.name === LISTING_IMAGES_BUCKET);
        return { exists: !!bucketExists };
    } catch (e) {
        return { exists: false, error: String(e) };
    }
}

/**
 * Uploads a single image to Supabase Storage with retry logic
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

    // Decode base64 to ArrayBuffer before upload loop
    const arrayBuffer = decode(base64);

    // Upload with retry logic
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const uploadPromise = supabase.storage
                .from(LISTING_IMAGES_BUCKET)
                .upload(filename, arrayBuffer, {
                    contentType,
                    upsert: false,
                });

            const { data: uploadData, error: uploadError } = await withTimeout(
                uploadPromise,
                UPLOAD_TIMEOUT_MS,
                `Upload to ${LISTING_IMAGES_BUCKET}`
            );

            if (!uploadError && uploadData) {
                const { data: urlData } = supabase.storage
                    .from(LISTING_IMAGES_BUCKET)
                    .getPublicUrl(uploadData.path);
                return urlData.publicUrl;
            }

            // Log detailed error information
            console.error(`[ImageUpload] Attempt ${attempt} failed:`, {
                message: uploadError?.message,
                name: uploadError?.name,
                status: (uploadError as any)?.status,
                statusCode: (uploadError as any)?.statusCode,
                error: uploadError,
            });

            lastError = new Error(uploadError?.message || 'Unknown upload error');

            // Check for specific error conditions that shouldn't be retried
            const errorMessage = uploadError?.message?.toLowerCase() || '';
            if (errorMessage.includes('bucket') && errorMessage.includes('not found')) {
                throw new Error(`Storage bucket '${LISTING_IMAGES_BUCKET}' not found. Please create it on the server.`);
            }
            if (errorMessage.includes('policy') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
                throw new Error(`Permission denied: ${uploadError?.message}. Check RLS policies on storage.objects.`);
            }
        } catch (error) {
            console.error(`[ImageUpload] Attempt ${attempt} threw exception:`, error);
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on timeout - likely a network/server issue
            if (lastError.message.includes('timed out')) {
                throw lastError;
            }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            await delay(delayMs);
        }
    }

    // All retries failed - provide diagnostic information
    const bucketCheck = await checkBucketExists();

    let errorMessage = `Failed to upload image after ${MAX_RETRIES} attempts: ${lastError?.message}`;
    if (!bucketCheck.exists) {
        errorMessage += `. Bucket '${LISTING_IMAGES_BUCKET}' may not exist or is inaccessible.`;
    }

    throw new Error(errorMessage);
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

    // Test connectivity once before starting uploads
    const connectivity = await testStorageConnectivity();
    if (!connectivity.reachable) {
        throw new Error(`Cannot reach storage server: ${connectivity.error}. Check network connection and server availability.`);
    }

    const uploadPromises = uris.map(uri => uploadSingleImage(uri, userId));
    const publicUrls = await Promise.all(uploadPromises);
    return publicUrls;
}
