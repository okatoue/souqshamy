import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const DRAFT_KEY = '@listing_draft';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ListingDraft {
  title: string;
  description: string;
  price: string;
  currency: 'SYP' | 'USD';
  images: string[]; // Local URIs only (can't persist cloud URLs between sessions)
  location: string | null;
  locationCoordinates: { latitude: number; longitude: number } | null;
  phoneNumber: string;
  whatsappNumber: string;
  sameAsPhone: boolean;
  categoryId: number;
  subcategoryId: number;
  categoryName: string;
  subcategoryName: string;
  categoryIcon: string;
  savedAt: number;
}

interface UseDraftReturn {
  hasDraft: boolean;
  isLoading: boolean;
  saveDraft: (draft: Omit<ListingDraft, 'savedAt'>) => Promise<void>;
  loadDraft: () => Promise<ListingDraft | null>;
  clearDraft: () => Promise<void>;
}

export function useDraft(): UseDraftReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastSaveRef = useRef<string | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem(DRAFT_KEY);
        if (stored) {
          const draft: ListingDraft = JSON.parse(stored);
          // Check if draft is less than 24 hours old
          const isRecent = Date.now() - draft.savedAt < DRAFT_EXPIRY_MS;
          setHasDraft(isRecent);
          if (!isRecent) {
            // Expired draft - clean it up
            await AsyncStorage.removeItem(DRAFT_KEY);
          }
        }
      } catch (error) {
        console.error('[Draft] Error checking draft:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkDraft();
  }, []);

  const saveDraft = useCallback(async (draft: Omit<ListingDraft, 'savedAt'>) => {
    try {
      const fullDraft: ListingDraft = {
        ...draft,
        savedAt: Date.now(),
      };

      // Only save if data has actually changed
      const draftString = JSON.stringify(fullDraft);
      const draftWithoutTimestamp = JSON.stringify({
        ...draft,
        savedAt: 0,
      });

      if (lastSaveRef.current === draftWithoutTimestamp) {
        // Data hasn't changed, skip save
        return;
      }

      await AsyncStorage.setItem(DRAFT_KEY, draftString);
      lastSaveRef.current = draftWithoutTimestamp;
      setHasDraft(true);
    } catch (error) {
      console.error('[Draft] Error saving draft:', error);
    }
  }, []);

  const loadDraft = useCallback(async (): Promise<ListingDraft | null> => {
    try {
      const stored = await AsyncStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft: ListingDraft = JSON.parse(stored);
        // Check if draft is still valid (not expired)
        if (Date.now() - draft.savedAt < DRAFT_EXPIRY_MS) {
          return draft;
        }
        // Expired - clean up
        await AsyncStorage.removeItem(DRAFT_KEY);
      }
      return null;
    } catch (error) {
      console.error('[Draft] Error loading draft:', error);
      return null;
    }
  }, []);

  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
      lastSaveRef.current = null;
      setHasDraft(false);
    } catch (error) {
      console.error('[Draft] Error clearing draft:', error);
    }
  }, []);

  return {
    hasDraft,
    isLoading,
    saveDraft,
    loadDraft,
    clearDraft,
  };
}

/**
 * Hook for auto-saving drafts at regular intervals.
 * Should be called inside a component with the current form state.
 */
export function useAutoSaveDraft(
  getDraft: () => Omit<ListingDraft, 'savedAt'>,
  enabled: boolean = true
) {
  const { saveDraft } = useDraft();
  const getDraftRef = useRef(getDraft);

  // Keep ref updated with latest getDraft function
  useEffect(() => {
    getDraftRef.current = getDraft;
  }, [getDraft]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const draft = getDraftRef.current();
      // Only save if there's meaningful content
      const hasContent =
        draft.title.trim() !== '' ||
        draft.description.trim() !== '' ||
        draft.price !== '' ||
        draft.images.length > 0;

      if (hasContent) {
        saveDraft(draft);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, saveDraft]);
}
