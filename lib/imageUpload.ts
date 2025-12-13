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
        console.log('[ImageUpload] Testing storage connectivity...');
        // Use listBuckets as a lightweight connectivity test
        const { data, error } = await withTimeout(
            supabase.storage.listBuckets(),
            10000, // 10 second timeout for connectivity test
            'Storage connectivity test'
        );
        const latencyMs = Date.now() - startTime;

        if (error) {
            console.error('[ImageUpload] Connectivity test failed:', error.message);
            return { reachable: false, latencyMs, error: error.message };
        }

        console.log(`[ImageUpload] Storage reachable (${latencyMs}ms), found ${data?.length || 0} buckets`);
        return { reachable: true, latencyMs };
    } catch (e) {
        const latencyMs = Date.now() - startTime;
        console.error('[ImageUpload] Connectivity test exception:', e);
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
            console.error('[ImageUpload] Failed to list buckets:', error);
            return { exists: false, error: error.message };
        }
        const bucketExists = data?.some(b => b.id === LISTING_IMAGES_BUCKET || b.name === LISTING_IMAGES_BUCKET);
        console.log(`[ImageUpload] Bucket '${LISTING_IMAGES_BUCKET}' exists:`, bucketExists);
        console.log('[ImageUpload] Available buckets:', data?.map(b => b.name).join(', ') || 'none');
        return { exists: !!bucketExists };
    } catch (e) {
        console.error('[ImageUpload] Error checking bucket:', e);
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
    console.log('[ImageUpload] Reading file:', uri);
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    const fileSizeKB = Math.round((base64.length * 3) / 4 / 1024);
    console.log(`[ImageUpload] File size: ${fileSizeKB} KB`);

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
    console.log(`[ImageUpload] Content type: ${contentType}`);

    // Generate unique filename: userId/timestamp_random.extension
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${userId}/${timestamp}_${randomId}.${extension}`;
    console.log(`[ImageUpload] Target filename: ${filename}`);

    // Decode base64 to ArrayBuffer before upload loop
    console.log('[ImageUpload] Decoding base64 to ArrayBuffer...');
    const arrayBuffer = decode(base64);
    console.log(`[ImageUpload] ArrayBuffer created, size: ${arrayBuffer.byteLength} bytes`);

    // Upload with retry logic
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[ImageUpload] Upload attempt ${attempt}/${MAX_RETRIES} to bucket '${LISTING_IMAGES_BUCKET}'`);
        console.log(`[ImageUpload] Starting upload request at ${new Date().toISOString()}`);

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

            console.log(`[ImageUpload] Upload request completed at ${new Date().toISOString()}`);

            if (!uploadError && uploadData) {
                console.log('[ImageUpload] Upload successful:', uploadData.path);
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
                console.error('[ImageUpload] Bucket does not exist - checking available buckets...');
                await checkBucketExists();
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
                console.error('[ImageUpload] Request timed out - possible network or server issue');
                throw lastError;
            }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`[ImageUpload] Waiting ${delayMs}ms before retry...`);
            await delay(delayMs);
        }
    }

    // All retries failed - provide diagnostic information
    console.error('[ImageUpload] All upload attempts failed. Running diagnostics...');
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
    console.log(`[ImageUpload] Starting upload of ${uris.length} image(s)`);
    const connectivity = await testStorageConnectivity();
    if (!connectivity.reachable) {
        throw new Error(`Cannot reach storage server: ${connectivity.error}. Check network connection and server availability.`);
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
