import { uploadListingImages } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabase';
import { CreateListingDTO, Listing } from '@/types/listing';
import { useState } from 'react';

interface UseCreateListingResult {
    createListing: (listingData: CreateListingDTO) => Promise<{ data: Listing | null; error: Error | null }>;
    isLoading: boolean;
    uploadProgress: string;
    error: Error | null;
}

export function useCreateListing(): UseCreateListingResult {
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState<Error | null>(null);

    const createListing = async (listingData: CreateListingDTO) => {
        setIsLoading(true);
        setError(null);
        setUploadProgress('');

        try {
            // Upload images to Supabase Storage if present
            let uploadedImageUrls: string[] | null = null;

            if (listingData.images && listingData.images.length > 0) {
                setUploadProgress(`Uploading ${listingData.images.length} image(s)...`);

                uploadedImageUrls = await uploadListingImages(
                    listingData.images,
                    listingData.user_id
                );

                if (uploadedImageUrls.length === 0 && listingData.images.length > 0) {
                    throw new Error('Failed to upload images. Please try again.');
                }

                setUploadProgress('Creating listing...');
            }

            // Create the listing with uploaded image URLs
            const { data, error: supabaseError } = await supabase
                .from('listings')
                .insert([{
                    ...listingData,
                    images: uploadedImageUrls && uploadedImageUrls.length > 0 ? uploadedImageUrls : null
                }])
                .select()
                .single();

            if (supabaseError) {
                throw new Error(supabaseError.message);
            }

            return { data, error: null };
        } catch (err) {
            const e = err instanceof Error ? err : new Error('An unexpected error occurred');
            console.error('Create listing error:', e);
            setError(e);
            return { data: null, error: e };
        } finally {
            setIsLoading(false);
            setUploadProgress('');
        }
    };

    return { createListing, isLoading, uploadProgress, error };
}
