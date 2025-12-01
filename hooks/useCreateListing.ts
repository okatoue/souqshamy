import { uploadListingImages } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabase';
import { CreateListingDTO, Listing } from '@/types/listing';
import { useState } from 'react';

interface UseCreateListingResult {
    createListing: (listingData: CreateListingDTO) => Promise<{ data: Listing | null; error: Error | null }>;
    isLoading: boolean;
    error: Error | null;
}

export function useCreateListing(): UseCreateListingResult {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const createListing = async (listingData: CreateListingDTO) => {
        setIsLoading(true);
        setError(null);

        try {
            // Upload images to Supabase Storage if present
            let uploadedImageUrls: string[] | null = null;
            if (listingData.images && listingData.images.length > 0) {
                console.log('Uploading images to Supabase Storage...');
                uploadedImageUrls = await uploadListingImages(
                    listingData.images,
                    listingData.user_id
                );
                console.log('Images uploaded successfully:', uploadedImageUrls);
            }

            // Create listing with Supabase Storage URLs instead of local URIs
            const listingWithCloudImages = {
                ...listingData,
                images: uploadedImageUrls,
            };

            const { data, error: supabaseError } = await supabase
                .from('listings')
                .insert([listingWithCloudImages])
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
        }
    };

    return { createListing, isLoading, error };
}
