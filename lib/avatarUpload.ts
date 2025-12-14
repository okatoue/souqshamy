// lib/avatarUpload.ts
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const AVATARS_BUCKET = 'avatars';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const UPLOAD_TIMEOUT_MS = 30000; // 30 second timeout for avatar upload

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
 * Extracts the storage path from a public URL
 * @param avatarUrl - Public URL of the avatar
 * @returns Storage path or null if not a valid avatar URL
 */
function getStoragePathFromUrl(avatarUrl: string): string | null {
    try {
        // URL format: https://{project}.supabase.co/storage/v1/object/public/avatars/{userId}/avatar_{timestamp}.{ext}
        const match = avatarUrl.match(/\/avatars\/(.+)$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * Deletes an avatar from Supabase storage
 * @param avatarUrl - Public URL of the avatar to delete
 */
export async function deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl) return;

    const storagePath = getStoragePathFromUrl(avatarUrl);
    if (!storagePath) {
        console.warn('[AvatarUpload] Could not extract storage path from URL:', avatarUrl);
        return;
    }

    try {
        const { error } = await supabase.storage
            .from(AVATARS_BUCKET)
            .remove([storagePath]);

        if (error) {
            console.error('[AvatarUpload] Error deleting avatar:', error);
            // Don't throw - deletion failures shouldn't block new uploads
        }
    } catch (e) {
        console.error('[AvatarUpload] Exception deleting avatar:', e);
        // Don't throw - deletion failures shouldn't block new uploads
    }
}

/**
 * Uploads an avatar image to Supabase Storage
 * @param uri - Local file URI (e.g., file:///...)
 * @param userId - User ID for organizing files
 * @param existingAvatarUrl - Optional URL of existing avatar to delete
 * @returns Public URL of the uploaded avatar
 */
export async function uploadAvatar(
    uri: string,
    userId: string,
    existingAvatarUrl?: string | null
): Promise<string> {
    // Delete existing avatar first (if any)
    if (existingAvatarUrl) {
        await deleteAvatar(existingAvatarUrl);
    }

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
        'webp': 'image/webp',
    };
    const contentType = mimeTypes[extension] || 'image/jpeg';

    // Generate unique filename: userId/avatar_timestamp.extension
    const timestamp = Date.now();
    const filename = `${userId}/avatar_${timestamp}.${extension === 'jpeg' ? 'jpg' : extension}`;

    // Decode base64 to ArrayBuffer before upload loop
    const arrayBuffer = decode(base64);

    // Upload with retry logic
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const uploadPromise = supabase.storage
                .from(AVATARS_BUCKET)
                .upload(filename, arrayBuffer, {
                    contentType,
                    upsert: false,
                });

            const { data: uploadData, error: uploadError } = await withTimeout(
                uploadPromise,
                UPLOAD_TIMEOUT_MS,
                `Upload to ${AVATARS_BUCKET}`
            );

            if (!uploadError && uploadData) {
                const { data: urlData } = supabase.storage
                    .from(AVATARS_BUCKET)
                    .getPublicUrl(uploadData.path);
                return urlData.publicUrl;
            }

            // Log detailed error information
            console.error(`[AvatarUpload] Attempt ${attempt} failed:`, {
                message: uploadError?.message,
                name: uploadError?.name,
                error: uploadError,
            });

            lastError = new Error(uploadError?.message || 'Unknown upload error');

            // Check for specific error conditions that shouldn't be retried
            const errorMessage = uploadError?.message?.toLowerCase() || '';
            if (errorMessage.includes('bucket') && errorMessage.includes('not found')) {
                throw new Error(`Storage bucket '${AVATARS_BUCKET}' not found. Please contact support.`);
            }
            if (errorMessage.includes('policy') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
                throw new Error(`Permission denied: ${uploadError?.message}. Please try again or contact support.`);
            }
            if (errorMessage.includes('payload too large') || errorMessage.includes('file size')) {
                throw new Error('Image is too large. Please choose a smaller image (max 5MB).');
            }
        } catch (error) {
            console.error(`[AvatarUpload] Attempt ${attempt} threw exception:`, error);
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on timeout - likely a network/server issue
            if (lastError.message.includes('timed out')) {
                throw lastError;
            }
            // Don't retry on known non-retryable errors
            if (lastError.message.includes('too large') || lastError.message.includes('Permission denied')) {
                throw lastError;
            }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            await delay(delayMs);
        }
    }

    throw new Error(`Failed to upload avatar after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
