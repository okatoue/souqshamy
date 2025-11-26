import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';
import { SearchResult } from '../types';

interface UseLocationSearchResult {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: SearchResult[];
    isSearching: boolean;
    showSearchResults: boolean;
    setShowSearchResults: (show: boolean) => void;
    searchLocation: () => Promise<void>;
    clearSearch: () => void;
}

export function useLocationSearch(): UseLocationSearchResult {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const searchLocation = useCallback(async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setShowSearchResults(true);
        Keyboard.dismiss();

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchQuery)},سوريا&` +
                `format=json&limit=5&` +
                `bounded=1&` +
                `viewbox=35.7,32.3,42.4,37.3&` +
                `accept-language=ar`
            );

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
        setShowSearchResults(false);
    }, []);

    return {
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        showSearchResults,
        setShowSearchResults,
        searchLocation,
        clearSearch,
    };
}
