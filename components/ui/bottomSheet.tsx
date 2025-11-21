import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Import the categories data and types
import categoriesData from '../../assets/categories.json';
import { Category, Subcategory } from '../../assets/categories.ts';

// Define the ref handle type
export interface CategoryBottomSheetRefProps {
    open: () => void;
    close: () => void;
}

interface CategoryBottomSheetProps {
    onCategorySelect?: (category: Category, subcategory: Subcategory) => void;
    showCategories?: boolean; // NEW: Control whether to show categories
    children?: React.ReactNode; // NEW: Allow custom content
    title?: string; // NEW: Custom title when not using categories
}

const CategoryBottomSheet = forwardRef<CategoryBottomSheetRefProps, CategoryBottomSheetProps>(
    ({ onCategorySelect, showCategories = true, children, title }, ref) => {
        // Reference to the bottom sheet
        const bottomSheetRef = useRef<BottomSheet>(null);
        
        // State to track the selected main category
        const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
        
        // Define snap points
        const snapPoints = useMemo(() => ['50%', '75%', '90%'], []);
        
        // Expose methods to parent component
        useImperativeHandle(ref, () => ({
            open: () => {
                // Reset to main categories when opening
                setSelectedCategory(null);
                bottomSheetRef.current?.snapToIndex(0);
            },
            close: () => {
                bottomSheetRef.current?.close();
                // Reset state when closing
                setTimeout(() => setSelectedCategory(null), 300);
            },
        }));

        // Handle main category selection
        const handleCategoryPress = useCallback((category: Category) => {
            setSelectedCategory(category);
            // Snap to a higher position for categories with many subcategories
            if (category.subcategories.length > 10) {
                bottomSheetRef.current?.snapToIndex(1); // Snap to 75%
            }
        }, []);

        // Handle subcategory selection
        const handleSubcategoryPress = useCallback(
            (subcategory: Subcategory) => {
                if (selectedCategory) {
                    onCategorySelect?.(selectedCategory, subcategory);
                    // Close the bottom sheet after selection
                    bottomSheetRef.current?.close();
                    setTimeout(() => setSelectedCategory(null), 300);
                }
            },
            [selectedCategory, onCategorySelect]
        );

        // Handle back button press
        const handleBackPress = useCallback(() => {
            setSelectedCategory(null);
            bottomSheetRef.current?.snapToIndex(0); // Go back to 50%
        }, []);

        // Render main category item
        const renderCategoryItem = useCallback(
            (category: Category) => (
                <TouchableOpacity
                    key={category.id}
                    style={styles.categoryItem}
                    onPress={() => handleCategoryPress(category)}
                    activeOpacity={0.7}
                >
                    <View style={styles.categoryContent}>
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text style={styles.categoryText}>{category.name}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
            ),
            [handleCategoryPress]
        );

        // Render subcategory item
        const renderSubcategoryItem = useCallback(
            (subcategory: Subcategory) => (
                <TouchableOpacity
                    key={subcategory.id}
                    style={styles.categoryItem}
                    onPress={() => handleSubcategoryPress(subcategory)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.categoryText}>{subcategory.name}</Text>
                </TouchableOpacity>
            ),
            [handleSubcategoryPress]
        );

        // Handle backdrop press
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

        // Handle sheet changes
        const handleSheetChanges = useCallback((index: number) => {
            console.log('Sheet changed to index:', index);
        }, []);

        // Current title based on selection and props
        const currentTitle = showCategories 
            ? (selectedCategory ? selectedCategory.name : 'Select Category')
            : (title || 'Options');

        return (
            <BottomSheet
                ref={bottomSheetRef}
                index={-1} // Start closed
                snapPoints={snapPoints}
                enablePanDownToClose={true}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
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
                            // Show categories if showCategories is true
                            selectedCategory 
                                ? selectedCategory.subcategories.map(renderSubcategoryItem)
                                : categoriesData.categories.map(renderCategoryItem)
                        ) : (
                            // Show custom children if showCategories is false
                            children
                        )}
                    </BottomSheetScrollView>
                </View>
            </BottomSheet>
        );
    }
);

CategoryBottomSheet.displayName = 'CategoryBottomSheet';

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: 'white',
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
        backgroundColor: '#DDDDDD',
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
        color: '#333',
        flex: 1,
    },
    titleWithBack: {
        // Title stays centered when back button is present
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginVertical: 4,
        backgroundColor: '#F5F5F5',
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
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    chevron: {
        fontSize: 24,
        color: '#999',
        marginLeft: 8,
    },
});

export default CategoryBottomSheet;