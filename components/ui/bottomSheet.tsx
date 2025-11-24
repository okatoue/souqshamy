// 1. Change import from BottomSheet to BottomSheetModal
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Category, Subcategory } from '../../assets/categories';
import categoriesData from '../../assets/categories.json';

export interface CategoryBottomSheetRefProps {
    open: () => void;
    close: () => void;
}

interface CategoryBottomSheetProps {
    onCategorySelect?: (category: Category, subcategory: Subcategory) => void;
    showCategories?: boolean;
    children?: React.ReactNode;
    title?: string;
}

const CategoryBottomSheet = forwardRef<CategoryBottomSheetRefProps, CategoryBottomSheetProps>(
    ({ onCategorySelect, showCategories = true, children, title }, ref) => {
        // 2. Change ref type to BottomSheetModal
        const bottomSheetRef = useRef<BottomSheetModal>(null);

        const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

        const snapPoints = useMemo(() => ['50%', '75%', '90%'], []);

        useImperativeHandle(ref, () => ({
            open: () => {
                setSelectedCategory(null);
                // 3. Use present() instead of snapToIndex for Modals
                bottomSheetRef.current?.present();
            },
            close: () => {
                // 4. Use dismiss() for Modals
                bottomSheetRef.current?.dismiss();
                setTimeout(() => setSelectedCategory(null), 300);
            },
        }));

        const handleCategoryPress = useCallback((category: Category) => {
            setSelectedCategory(category);
            // You can still use snapToIndex on the modal ref if needed
            if (category.subcategories.length > 10) {
                bottomSheetRef.current?.snapToIndex(1);
            }
        }, []);

        const handleSubcategoryPress = useCallback(
            (subcategory: Subcategory) => {
                if (selectedCategory) {
                    onCategorySelect?.(selectedCategory, subcategory);
                    bottomSheetRef.current?.dismiss(); // Changed to dismiss
                    setTimeout(() => setSelectedCategory(null), 300);
                }
            },
            [selectedCategory, onCategorySelect]
        );

        const handleBackPress = useCallback(() => {
            setSelectedCategory(null);
            bottomSheetRef.current?.snapToIndex(0);
        }, []);

        const backgroundColor = useThemeColor({}, 'background');
        const textColor = useThemeColor({}, 'text');
        const iconColor = useThemeColor({}, 'icon');
        const itemBackground = useThemeColor({ light: '#F5F5F5', dark: '#1a1a1a' }, 'background');
        const handleColor = useThemeColor({ light: '#DDDDDD', dark: '#444' }, 'icon');
        const chevronColor = useThemeColor({ light: '#999', dark: '#666' }, 'icon');

        const renderBackdrop = useCallback(
            (props: any) => (
                <BottomSheetBackdrop
                    {...props}
                    appearsOnIndex={0}
                    disappearsOnIndex={-1}
                    opacity={0.5}
                />
            ),
            []
        );

        const handleSheetChanges = useCallback((index: number) => {
            console.log('Sheet changed to index:', index);
        }, []);

        const currentTitle = showCategories
            ? (selectedCategory ? selectedCategory.name : 'Select Category')
            : (title || 'Options');

        // 5. Replace BottomSheet with BottomSheetModal and remove index={-1}
        return (
            <BottomSheetModal
                ref={bottomSheetRef}
                snapPoints={snapPoints}
                enablePanDownToClose={true}
                backgroundStyle={[styles.bottomSheetBackground, { backgroundColor }]}
                handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: handleColor }]}
                backdropComponent={renderBackdrop}
                onChange={handleSheetChanges}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.header}>
                        {showCategories && selectedCategory && (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleBackPress}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.backButtonText}>‹ Back</Text>
                            </TouchableOpacity>
                        )}
                        <Text style={[
                            styles.title,
                            { color: textColor },
                            selectedCategory && styles.titleWithBack
                        ]}>
                            {currentTitle}
                        </Text>
                    </View>

                    <BottomSheetScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollViewContent}
                    >
                        {showCategories ? (
                            selectedCategory
                                ? selectedCategory.subcategories.map((subcategory) => (
                                    <TouchableOpacity
                                        key={subcategory.id}
                                        style={[styles.categoryItem, { backgroundColor: itemBackground }]}
                                        onPress={() => handleSubcategoryPress(subcategory)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.categoryText, { color: textColor }]}>{subcategory.name}</Text>
                                    </TouchableOpacity>
                                ))
                                : categoriesData.categories.map((category) => (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[styles.categoryItem, { backgroundColor: itemBackground }]}
                                        onPress={() => handleCategoryPress(category)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.categoryContent}>
                                            <Text style={[styles.categoryIcon, { color: iconColor }]}>{category.icon}</Text>
                                            <Text style={[styles.categoryText, { color: textColor }]}>{category.name}</Text>
                                        </View>
                                        <Text style={[styles.chevron, { color: chevronColor }]}>›</Text>
                                    </TouchableOpacity>
                                ))
                        ) : (
                            children
                        )}
                    </BottomSheetScrollView>
                </View>
            </BottomSheetModal>
        );
    }
);

CategoryBottomSheet.displayName = 'CategoryBottomSheet';

const styles = StyleSheet.create({
    // ... existing styles remain the same
    bottomSheetBackground: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -3,
        },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    handleIndicator: {
        width: 40,
        height: 4,
        marginTop: 8,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
        minHeight: 32,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        zIndex: 1,
        padding: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
    },
    titleWithBack: {
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginVertical: 4,
        borderRadius: 12,
    },
    categoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    categoryText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    chevron: {
        fontSize: 24,
        marginLeft: 8,
    },
});

export default CategoryBottomSheet;