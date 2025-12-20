import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { CreateListingDTO, Listing } from '@/types/listing';
import { useState } from 'react';

const LISTING_IMAGES_BUCKET = 'listing-images';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const UPLOAD_TIMEOUT_MS = 60000;

// Upload progress tracking
export interface UploadProgress {
    total: number;
    completed: number;
    currentImage: number;
    percentage: number;
}

interface CreateListingResult {
    data: Listing | null;
    error: Error | null;
    warning?: string;
}

interface UseCreateListingResult {
    createListing: (listingData: CreateListingDTO) => Promise<CreateListingResult>;
    isLoading: boolean;
    error: Error | null;
    uploadProgress: UploadProgress | null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

async function testStorageConnectivity(): Promise<boolean> {
    try {
        const { error } = await withTimeout(
            supabase.storage.listBuckets(),
            10000,
            'Storage connectivity test'
        );
        return !error;
    } catch {
        return false;
    }
}

async function uploadSingleImage(uri: string, userId: string): Promise<string | null> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const uriParts = uri.split('.');
    const extension = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';

    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'heic': 'image/heic',
    };
    const contentType = mimeTypes[extension] || 'image/jpeg';

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `${userId}/${timestamp}_${randomId}.${extension}`;

    const arrayBuffer = decode(base64);

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

            lastError = new Error(uploadError?.message || 'Unknown upload error');

            // Don't retry on permission errors
            const errorMessage = uploadError?.message?.toLowerCase() || '';
            if (errorMessage.includes('policy') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
                throw lastError;
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (lastError.message.includes('timed out')) {
                throw lastError;
            }
        }

        if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            await delay(delayMs);
        }
    }

    console.error(`[CreateListing] Image upload failed after ${MAX_RETRIES} attempts:`, lastError);
    return null;
}

export function useCreateListing(): UseCreateListingResult {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

    const createListing = async (listingData: CreateListingDTO): Promise<CreateListingResult> => {
        setIsLoading(true);
        setError(null);
        setUploadProgress(null);

        try {
            let imageUrls: string[] = [];
            let uploadWarning: string | undefined;

            // Upload images if any
            if (listingData.images && listingData.images.length > 0) {
                const localImages = listingData.images;
                const total = localImages.length;

                // Test connectivity first
                const isConnected = await testStorageConnectivity();
                if (!isConnected) {
                    throw new Error('Cannot connect to storage server. Please check your internet connection.');
                }

                // Upload images sequentially for progress tracking
                const successful: string[] = [];
                let failed = 0;

                for (let i = 0; i < localImages.length; i++) {
                    setUploadProgress({
                        total,
                        completed: i,
                        currentImage: i + 1,
                        percentage: Math.round((i / total) * 100),
                    });

                    try {
                        const url = await uploadSingleImage(localImages[i], listingData.user_id);
                        if (url) {
                            successful.push(url);
                        } else {
                            failed++;
                        }
                    } catch (err) {
                        console.error(`[CreateListing] Image ${i + 1} failed:`, err);
                        failed++;
                    }
                }

                setUploadProgress({
                    total,
                    completed: total,
                    currentImage: total,
                    percentage: 100,
                });

                imageUrls = successful;

                if (failed > 0) {
                    if (successful.length === 0) {
                        // All failed
                        throw new Error(`All ${failed} images failed to upload. Please try again.`);
                    } else {
                        // Partial success - set warning
                        uploadWarning = `${failed} image(s) failed to upload. Continuing with ${successful.length} image(s).`;
                    }
                }
            }

            // Create listing with successfully uploaded images
            const listingWithCloudImages = {
                ...listingData,
                images: imageUrls.length > 0 ? imageUrls : null,
            };

            const { data, error: supabaseError } = await supabase
                .from('listings')
                .insert([listingWithCloudImages])
                .select()
                .single();

            if (supabaseError) {
                throw new Error(supabaseError.message);
            }

            // Clear progress after short delay
            setTimeout(() => setUploadProgress(null), 500);

            return { data, error: null, warning: uploadWarning };
        } catch (err) {
            const e = err instanceof Error ? err : new Error('An unexpected error occurred');
            console.error('Create listing error:', e);
            setError(e);
            setUploadProgress(null);
            return { data: null, error: e };
        } finally {
            setIsLoading(false);
        }
    };

    return { createListing, isLoading, error, uploadProgress };
}
