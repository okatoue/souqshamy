export interface LocationPickerModalProps {
    visible: boolean;
    currentLocation: string;
    currentRadius: number;
    currentCoordinates?: { latitude: number; longitude: number };
    onConfirm: (location: string, coordinates: { latitude: number; longitude: number }, radius: number) => void;
    onClose: () => void;
}

export interface SearchResult {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface MapMessage {
    type: 'mapReady' | 'mapMoved' | 'radiusChanged';
    lat?: number;
    lng?: number;
    radius?: number;
}
