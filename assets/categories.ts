import { ImageSourcePropType } from 'react-native';

export interface Subcategory {
    id: number;  // Changed from string to number
    name: string;
}

export interface Category {
    id: number;  // Changed from string to number
    name: string;
    icon: string;
    customImage?: ImageSourcePropType;  // Optional custom image for category icon
    subcategories: Subcategory[];
}

export interface CategoriesData {
    categories: Category[];
}
