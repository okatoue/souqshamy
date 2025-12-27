import { getCategoryIcon } from '@/assets/categoryAssets';
import categoriesData from '@/assets/categories.json';
import CategoryBottomSheet, { CategoryBottomSheetRefProps } from '@/components/ui/bottomSheet';
import { SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getCategoryTranslation, getSubcategoryTranslation } from '@/lib/categoryTranslations';
import { useTranslation } from '@/localization';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Dimensions, Image, ImageSourcePropType, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

export function CategoriesList() {
    const { t } = useTranslation();
    const textColor = useThemeColor({}, 'text');
    const itemBackground = useThemeColor({ light: '#F5F5F5', dark: '#1a1a1a' }, 'background');

    const bottomSheetRef = useRef<CategoryBottomSheetRefProps>(null);

    // Get the Buy & Sell category data (ID 1) from categories.json
    const buySellCategory = categoriesData.categories.find(c => c.id === 1);

    // Build category display data from categories.json + categoryAssets
    // This ensures category names are translated based on current language
    // while icons come from the centralized asset map
    const categoryDisplayData = useMemo<CategoryDisplayItem[]>(() => {
        return categoriesData.categories
            .filter(category => getCategoryIcon(category.id) !== null)
            .map(category => ({
                id: category.id,
                name: getCategoryTranslation(category.id, t),
                image: getCategoryIcon(category.id)!,
            }));
    }, [t]);

    const handleCategoryPress = (category: CategoryDisplayItem) => {
        // Buy & Sell (id: 1) opens the bottom sheet for subcategory selection
        if (category.id === 1) {
            bottomSheetRef.current?.open();
        } else {
            // All other categories navigate directly with numeric ID
            // Name comes from the unified categoryDisplayData (derived from categories.json)
            router.push({
                pathname: '/category/[id]',
                params: {
                    id: category.id.toString(),
                    name: category.name
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
                <View style={styles.gridRow} accessibilityRole="list">
                    {row1.map((category) => (
                        <Pressable
                            key={category.id}
                            onPress={() => handleCategoryPress(category)}
                            style={({ pressed }) => [
                                styles.categoryButton,
                                pressed && styles.categoryButtonPressed
                            ]}
                            accessibilityLabel={`Browse ${category.name} category`}
                            accessibilityRole="button"
                            accessibilityHint={category.id === 1 ? 'Opens subcategory selection' : 'Shows listings in this category'}
                        >
                            <Image
                                source={category.image}
                                style={styles.categoryImage}
                                resizeMode="contain"
                                accessibilityIgnoresInvertColors
                            />
                            <Text style={[styles.categoryName, { color: textColor }]}>{category.name}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Second row */}
                <View style={styles.gridRow} accessibilityRole="list">
                    {row2.map((category) => (
                        <Pressable
                            key={category.id}
                            onPress={() => handleCategoryPress(category)}
                            style={({ pressed }) => [
                                styles.categoryButton,
                                pressed && styles.categoryButtonPressed
                            ]}
                            accessibilityLabel={`Browse ${category.name} category`}
                            accessibilityRole="button"
                            accessibilityHint="Shows listings in this category"
                        >
                            <Image
                                source={category.image}
                                style={styles.categoryImage}
                                resizeMode="contain"
                                accessibilityIgnoresInvertColors
                            />
                            <Text style={[styles.categoryName, { color: textColor }]}>{category.name}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Bottom sheet showing ONLY Buy & Sell subcategories */}
            <CategoryBottomSheet
                ref={bottomSheetRef}
                title={t('categories.buySell')}
                showCategories={false}
            >
                <View style={{ paddingBottom: 20 }} accessibilityRole="list">
                    {buySellCategory?.subcategories.map((subcategory) => (
                        <TouchableOpacity
                            key={subcategory.id}
                            style={[styles.sheetItem, { backgroundColor: itemBackground }]}
                            onPress={() => handleSubcategoryPress(subcategory)}
                            activeOpacity={0.7}
                            accessibilityLabel={`Select ${getSubcategoryTranslation(subcategory.id, t)}`}
                            accessibilityRole="button"
                            accessibilityHint="Shows listings in this subcategory"
                        >
                            <Text style={[styles.sheetItemText, { color: textColor }]}>
                                {getSubcategoryTranslation(subcategory.id, t)}
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
    categoryImage: {
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
