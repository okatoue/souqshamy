export interface Listing {
    id: number;
    user_id: string;
    title: string;
    category_id: number;
    subcategory_id: number;
    description: string;
    price: number;
    currency: string;
    phone_number: string | null;
    images: string[] | null;
    status: 'active' | 'sold' | 'inactive';
    location: string;
    location_lat: number | null;
    location_lon: number | null;
    created_at: string;
    updated_at: string;
}

export interface CreateListingDTO {
    user_id: string;
    title: string;
    category_id: number;
    subcategory_id: number;
    description: string;
    price: number;
    currency: string;
    phone_number: string | null;
    images: string[] | null;
    status: 'active' | 'sold' | 'inactive';
    location: string;
    location_lat: number | null;
    location_lon: number | null;
    created_at: string;
    updated_at: string;
}
