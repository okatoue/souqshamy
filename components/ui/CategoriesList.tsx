import categoriesData from '@/assets/categories.json';
import CategoryBottomSheet, { CategoryBottomSheetRefProps } from '@/components/ui/bottomSheet';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Dimensions, Image, ImageSourcePropType, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Import custom category icons
import BuyAndSellIcon from '@/assets/images/BuyAndSell.png';
import CarsIcon from '@/assets/images/cars.png';
import RealEstateIcon from '@/assets/images/realEstate.png';
import JobsIcon from '@/assets/images/jobs.png';
import ServicesIcon from '@/assets/images/services.png';
import PetsIcon from '@/assets/images/pets.png';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_PADDING = SPACING.lg;
const ITEM_MARGIN = SPACING.sm;
const ITEM_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - (ITEM_MARGIN * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

interface CategoryDisplayItem {
    id: number;  // Numeric ID matching categories.json
    name: string;
    image: ImageSourcePropType;  // Custom PNG image for category
}

// Map category IDs to their icons (IDs match categories.json)
const categoryDisplayData: CategoryDisplayItem[] = [
    {
        id: 1,  // Buy & Sell
        name: 'Buy & Sell',
        image: BuyAndSellIcon,
    },
    {
        id: 2,  // Cars
        name: 'Cars',
        image: CarsIcon,
    },
    {
        id: 3,  // Real Estate
        name: 'Real Estate',
        image: RealEstateIcon,
    },
    {
        id: 4,  // Jobs
        name: 'Jobs',
        image: JobsIcon,
    },
    {
        id: 5,  // Services
        name: 'Services',
        image: ServicesIcon,
    },
    {
        id: 6,  // Pets
        name: 'Pets',
        image: PetsIcon,
    }
];

export function CategoriesList() {
    const textColor = useThemeColor({}, 'text');
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

    // Split categories into rows of 3
    const row1 = categoryDisplayData.slice(0, 3);
    const row2 = categoryDisplayData.slice(3, 6);

    return (
        <>
            <View style={styles.gridContainer}>
                {/* First row */}
                <View style={styles.gridRow}>
                    {row1.map((category) => (
                        <Pressable
                            key={category.id}
                            onPress={() => handleCategoryPress(category)}
                            style={({ pressed }) => [
                                styles.categoryButton,
                                pressed && styles.categoryButtonPressed
                            ]}>
                            <Image
                                source={category.image}
                                style={styles.categoryImage}
                                resizeMode="contain"
                            />
                            <Text style={[styles.categoryName, { color: textColor }]}>{category.name}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Second row */}
                <View style={styles.gridRow}>
                    {row2.map((category) => (
                        <Pressable
                            key={category.id}
                            onPress={() => handleCategoryPress(category)}
                            style={({ pressed }) => [
                                styles.categoryButton,
                                pressed && styles.categoryButtonPressed
                            ]}>
                            <Image
                                source={category.image}
                                style={styles.categoryImage}
                                resizeMode="contain"
                            />
                            <Text style={[styles.categoryName, { color: textColor }]}>{category.name}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

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
    gridContainer: {
        paddingHorizontal: GRID_PADDING,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    categoryButton: {
        width: ITEM_WIDTH,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
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
        marginBottom: SPACING.sm,
    },
    customIcon: {
        width: 100,
        height: 100,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: SPACING.xs,
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
