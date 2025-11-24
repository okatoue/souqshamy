export interface Subcategory {
    id: number;  // Changed from string to number
    name: string;
}

export interface Category {
    id: number;  // Changed from string to number
    name: string;
    icon: string;
    subcategories: Subcategory[];
}

export interface CategoriesData {
    categories: Category[];
}