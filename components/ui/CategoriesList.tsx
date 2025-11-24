import categoriesData from '@/assets/categories.json';
import CategoryBottomSheet, { CategoryBottomSheetRefProps } from '@/components/ui/bottomSheet';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CategoryDisplayItem {
    id: number;  // Numeric ID matching categories.json
    name: string;
    icon: ReactNode;
}

// Map category IDs to their icons (IDs match categories.json)
const categoryDisplayData: CategoryDisplayItem[] = [
    {
        id: 1,  // Buy & Sell
        name: 'Buy & Sell',
        icon: <MaterialIcons name="shopping-cart" size={40} color="white" />
    },
    {
        id: 2,  // Cars
        name: 'Cars',
        icon: <FontAwesome5 name="car" size={36} color="white" />
    },
    {
        id: 3,  // Real Estate
        name: 'Real Estate',
        icon: <MaterialCommunityIcons name="home" size={40} color="white" />
    },
    {
        id: 4,  // Jobs
        name: 'Jobs',
        icon: <MaterialIcons name="work" size={40} color="white" />
    },
    {
        id: 5,  // Services
        name: 'Services',
        icon: <MaterialIcons name="build" size={40} color="white" />
    },
    {
        id: 6,  // Pets
        name: 'Pets',
        icon: <MaterialCommunityIcons name="paw" size={40} color="white" />
    }
];

export function CategoriesList() {
    const textColor = useThemeColor({}, 'text');
    const iconContainerBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255, 255, 255, 0.1)' }, 'background');
    const iconContainerBorder = useThemeColor({ light: 'rgba(0,0,0,0.1)', dark: 'rgba(255, 255, 255, 0.3)' }, 'icon');
    const itemBackground = useThemeColor({ light: '#F5F5F5', dark: '#1a1a1a' }, 'background');

    const bottomSheetRef = useRef<CategoryBottomSheetRefProps>(null);

    // Get the Buy & Sell category data (ID 1) from categories.json
    const buySellCategory = categoriesData.categories.find(c => c.id === 1);

    const handleCategoryPress = (category: CategoryDisplayItem) => {
        // Buy & Sell (id: 1) opens the bottom sheet for subcategory selection
        if (category.id === 1) {
            bottomSheetRef.current?.open();
        } else {
            // All other categories navigate directly with numeric ID
            const categoryFromJson = categoriesData.categories.find(c => c.id === category.id);
            router.push({
                pathname: '/category/[id]',
                params: {
                    id: category.id.toString(),
                    name: categoryFromJson?.name || category.name
                }
            });
        }
    };

    // Handle subcategory selection from bottom sheet
    const handleSubcategoryPress = (subcategory: { id: number; name: string }) => {
        bottomSheetRef.current?.close();
        // Navigate to category page with Buy & Sell category ID and selected subcategory
        router.push({
            pathname: '/category/[id]',
            params: {
                id: buySellCategory?.id.toString() || '1',
                name: buySellCategory?.name || 'Buy & Sell',
                subcategoryId: subcategory.id.toString()
            }
        });
    };

    return (
        <>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}>
                {categoryDisplayData.map((category) => (
                    <Pressable
                        key={category.id}
                        onPress={() => handleCategoryPress(category)}
                        style={({ pressed }) => [
                            styles.categoryButton,
                            pressed && styles.categoryButtonPressed
                        ]}>
                        <View style={[styles.iconContainer, { backgroundColor: iconContainerBg, borderColor: iconContainerBorder }]}>
                            {category.icon}
                        </View>
                        <Text style={[styles.categoryName, { color: textColor }]}>{category.name}</Text>
                    </Pressable>
                ))}
            </ScrollView>

            {/* Bottom sheet showing ONLY Buy & Sell subcategories */}
            <CategoryBottomSheet
                ref={bottomSheetRef}
                title="Buy & Sell Categories"
                showCategories={false}
            >
                <View style={{ paddingBottom: 20 }}>
                    {buySellCategory?.subcategories.map((subcategory) => (
                        <TouchableOpacity
                            key={subcategory.id}
                            style={[styles.sheetItem, { backgroundColor: itemBackground }]}
                            onPress={() => handleSubcategoryPress(subcategory)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.sheetItemText, { color: textColor }]}>
                                {subcategory.name}
                            </Text>
                            <MaterialIcons name="chevron-right" size={24} color={textColor} style={{ opacity: 0.5 }} />
                        </TouchableOpacity>
                    ))}
                </View>
            </CategoryBottomSheet>
        </>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 10,
    },
    categoryButton: {
        alignItems: 'center',
        padding: 10,
        marginHorizontal: 6,
    },
    categoryButtonPressed: {
        opacity: 0.7,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    // Bottom sheet item styles
    sheetItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginVertical: 4,
        borderRadius: 12,
    },
    sheetItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
});