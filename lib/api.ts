/**
 * Centralized API layer for the SouqShamy marketplace app.
 * Provides a consistent interface for all Supabase operations.
 */

import { supabase } from './supabase';
import { Listing } from '@/types/listing';
import { ConversationWithDetails, Message } from '@/types/chat';

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T> {
    data: T | null;
    error: Error | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wraps a promise with a timeout.
 * If the promise doesn't resolve within the timeout, it rejects with a timeout error.
 */
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

const API_TIMEOUT_MS = 10000; // 10 second timeout for API calls

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface ListingFilters {
    categoryId?: number;
    subcategoryId?: number;
    status?: 'active' | 'sold' | 'inactive';
    userId?: string;
    searchQuery?: string;
}

// ============================================================================
// Listings API
// ============================================================================

export const listingsApi = {
    /**
     * Fetches a single listing by ID.
     */
    async getById(id: string): Promise<ApiResponse<Listing>> {
        try {
            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Fetches listings for a specific user.
     */
    async getByUser(userId: string): Promise<ApiResponse<Listing[]>> {
        try {
            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Fetches listings by category with optional subcategory filter.
     */
    async getByCategory(
        categoryId: number,
        subcategoryId?: number
    ): Promise<ApiResponse<Listing[]>> {
        try {
            let query = supabase
                .from('listings')
                .select('*')
                .eq('category_id', categoryId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (subcategoryId) {
                query = query.eq('subcategory_id', subcategoryId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Fetches listings by multiple IDs.
     * @param ids - Array of listing IDs to fetch
     * @param options.includeInactive - If true, includes sold/inactive listings (for favorites)
     */
    async getByIds(
        ids: string[],
        options?: { includeInactive?: boolean }
    ): Promise<ApiResponse<Listing[]>> {
        try {
            if (ids.length === 0) {
                return { data: [], error: null };
            }

            let query = supabase
                .from('listings')
                .select('*')
                .in('id', ids);

            // Only filter by status if not including inactive
            if (!options?.includeInactive) {
                query = query.eq('status', 'active');
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Updates a listing's status.
     */
    async updateStatus(
        listingId: number,
        userId: string,
        status: 'active' | 'sold' | 'inactive'
    ): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('listings')
                .update({ status })
                .eq('id', listingId)
                .eq('user_id', userId);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return { data: false, error: error as Error };
        }
    },

    /**
     * Permanently deletes a listing.
     */
    async delete(listingId: number, userId: string): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', listingId)
                .eq('user_id', userId);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return { data: false, error: error as Error };
        }
    },

    /**
     * Searches listings by query.
     */
    async search(query: string, limit = 20): Promise<ApiResponse<Listing[]>> {
        try {
            const { data, error } = await supabase
                .from('listings')
                .select('*')
                .eq('status', 'active')
                .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },
};

// ============================================================================
// Favorites API
// ============================================================================

export const favoritesApi = {
    /**
     * Fetches a user's favorite listing IDs.
     * Includes timeout protection to prevent infinite hanging.
     */
    async getIds(userId: string): Promise<ApiResponse<string[]>> {
        try {
            const queryPromise = supabase
                .from('favorites')
                .select('listing_id')
                .eq('user_id', userId);

            const { data, error } = await withTimeout(
                queryPromise,
                API_TIMEOUT_MS,
                'favoritesApi.getIds'
            );

            if (error) throw error;
            return { data: data?.map(f => f.listing_id) || [], error: null };
        } catch (error) {
            console.error('[FavoritesApi] getIds error:', error);
            return { data: null, error: error as Error };
        }
    },

    /**
     * Adds a listing to favorites.
     */
    async add(userId: string, listingId: string): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('favorites')
                .insert({ user_id: userId, listing_id: listingId });

            // Handle duplicate gracefully
            if (error && error.code === '23505') {
                return { data: true, error: null };
            }
            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return { data: false, error: error as Error };
        }
    },

    /**
     * Removes a listing from favorites.
     */
    async remove(userId: string, listingId: string): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('listing_id', listingId);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return { data: false, error: error as Error };
        }
    },
};

// ============================================================================
// Conversations API
// ============================================================================

export const conversationsApi = {
    /**
     * Fetches all conversations for a user.
     */
    async getByUser(userId: string): Promise<ApiResponse<any[]>> {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    listing:listings(id, title, price, currency, images, status)
                `)
                .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
                .order('last_message_at', { ascending: false });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Fetches a single conversation by ID.
     */
    async getById(conversationId: string): Promise<ApiResponse<any>> {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    listing:listings(id, title, price, currency, images, status)
                `)
                .eq('id', conversationId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Finds or creates a conversation.
     */
    async getOrCreate(
        listingId: string,
        buyerId: string,
        sellerId: string
    ): Promise<ApiResponse<string>> {
        try {
            // Check if conversation exists
            const { data: existing } = await supabase
                .from('conversations')
                .select('id')
                .eq('listing_id', listingId)
                .eq('buyer_id', buyerId)
                .eq('seller_id', sellerId)
                .single();

            if (existing) {
                return { data: existing.id, error: null };
            }

            // Create new conversation
            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert({
                    listing_id: listingId,
                    buyer_id: buyerId,
                    seller_id: sellerId,
                })
                .select('id')
                .single();

            if (error) throw error;
            return { data: newConv?.id || null, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },
};

// ============================================================================
// Messages API
// ============================================================================

export const messagesApi = {
    /**
     * Fetches messages for a conversation.
     */
    async getByConversation(conversationId: string): Promise<ApiResponse<Message[]>> {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Sends a new message.
     */
    async send(
        conversationId: string,
        senderId: string,
        content: string
    ): Promise<ApiResponse<Message>> {
        try {
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: senderId,
                    content,
                })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Marks messages as read using the database RPC function.
     * This updates both the messages.is_read column and the
     * conversation's buyer_unread_count or seller_unread_count.
     */
    async markAsRead(
        conversationId: string,
        userId: string
    ): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase.rpc('mark_messages_as_read', {
                p_conversation_id: conversationId,
                p_user_id: userId
            });

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return { data: false, error: error as Error };
        }
    },
};

// ============================================================================
// Profiles API
// ============================================================================

export const profilesApi = {
    /**
     * Fetches a user profile by ID.
     */
    async getById(userId: string): Promise<ApiResponse<any>> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, phone_number, display_name, avatar_url')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Fetches multiple user profiles by IDs.
     */
    async getByIds(userIds: string[]): Promise<ApiResponse<any[]>> {
        try {
            if (userIds.length === 0) {
                return { data: [], error: null };
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, phone_number, display_name, avatar_url')
                .in('id', userIds);

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    },

    /**
     * Updates a user profile.
     */
    async update(
        userId: string,
        updates: Partial<{
            display_name: string;
            phone_number: string;
            avatar_url: string;
        }>
    ): Promise<ApiResponse<boolean>> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return { data: false, error: error as Error };
        }
    },
};
