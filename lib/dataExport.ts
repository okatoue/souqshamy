/**
 * Data export utilities for GDPR compliance.
 * Allows users to export their personal data from the app.
 */

import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
// Note: expo-sharing is imported dynamically to avoid native module errors at startup

export interface UserDataExport {
    exportedAt: string;
    profile: any;
    listings: any[];
    favorites: any[];
    conversations: any[];
    messages: any[];
}

/**
 * Exports all user data to a JSON file.
 * @param userId - The user's ID
 * @returns The file path to the exported JSON file
 */
export async function exportUserData(userId: string): Promise<string> {
    try {
        // Fetch all user data in parallel for better performance
        const [profileRes, listingsRes, favoritesRes, conversationsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('listings').select('*').eq('user_id', userId),
            supabase.from('favorites').select('*, listing:listings(id, title, price, images)').eq('user_id', userId),
            supabase
                .from('conversations')
                .select('*, messages(*)')
                .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
        ]);

        // Compile export data
        const exportData: UserDataExport = {
            exportedAt: new Date().toISOString(),
            profile: profileRes.data || null,
            listings: listingsRes.data || [],
            favorites: favoritesRes.data || [],
            conversations: conversationsRes.data || [],
            messages: conversationsRes.data?.flatMap((c: any) => c.messages || []) || [],
        };

        // Create JSON file
        const timestamp = Date.now();
        const fileName = `souqjari_data_export_${timestamp}.json`;
        const filePath = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(
            filePath,
            JSON.stringify(exportData, null, 2),
            { encoding: FileSystem.EncodingType.UTF8 }
        );

        return filePath;
    } catch (error) {
        console.error('[DataExport] Error exporting data:', error);
        throw new Error('Failed to export user data. Please try again.');
    }
}

/**
 * Shares the exported data file using the device's native share dialog.
 * @param filePath - The path to the exported file
 */
export async function shareExportedData(filePath: string): Promise<void> {
    try {
        // Dynamic import to avoid native module errors at app startup
        const Sharing = await import('expo-sharing');

        const isAvailable = await Sharing.isAvailableAsync();

        if (!isAvailable) {
            throw new Error('Sharing is not available on this device');
        }

        await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: 'Export Your SouqJari Data',
            UTI: 'public.json',
        });
    } catch (error: any) {
        // Handle case where expo-sharing native module is not available
        if (error?.message?.includes('Cannot find native module')) {
            throw new Error('Data export is not available in this environment. Please use the native app.');
        }
        throw error;
    }
}

/**
 * Convenience function that exports and shares user data in one step.
 * @param userId - The user's ID
 */
export async function exportAndShareUserData(userId: string): Promise<void> {
    const filePath = await exportUserData(userId);
    await shareExportedData(filePath);
}
