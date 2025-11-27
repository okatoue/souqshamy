import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BORDER_RADIUS, BRAND_COLOR, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Category, Subcategory } from '../../assets/categories';
import categoriesData from '../../assets/categories.json';

// =============================================================================
// Generic Bottom Sheet Component
// =============================================================================

export interface BottomSheetRefProps {
    open: () => void;
    close: () => void;
}

export interface GenericBottomSheetProps {
    /** Content to render inside the bottom sheet */
    children: React.ReactNode;
    /** Title displayed at the top of the sheet */
    title?: string;
    /** Custom snap points for the sheet height (default: ['50%', '75%', '90%']) */
    snapPoints?: (string | number)[];
    /** Callback when the sheet is dismissed */
    onDismiss?: () => void;
    /** Enable or disable pan down to close (default: true) */
    enablePanDownToClose?: boolean;
}

/**
 * Generic reusable bottom sheet component.
 * Use this for any custom content that needs to be displayed in a bottom sheet.
 */
export const BottomSheet = forwardRef<BottomSheetRefProps, GenericBottomSheetProps>(
    ({ children, title, snapPoints: customSnapPoints, onDismiss, enablePanDownToClose = true }, ref) => {
        const bottomSheetRef = useRef<BottomSheetModal>(null);

        const snapPoints = useMemo(
            () => customSnapPoints ?? ['50%', '75%', '90%'],
            [customSnapPoints]
        );

        // Theme colors
        const backgroundColor = useThemeColor({}, 'background');
        const textColor = useThemeColor({}, 'text');
        const handleColor = useThemeColor({}, 'handleIndicator');

        useImperativeHandle(ref, () => ({
            open: () => {
                // Snap to the first (and only) snap point index
                bottomSheetRef.current?.present();
                bottomSheetRef.current?.snapToIndex(0);
            },
            close: () => {
                bottomSheetRef.current?.dismiss();
            },
        }));

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
            if (index === -1 && onDismiss) {
                onDismiss();
            }
        }, [onDismiss]);

        return (
            <BottomSheetModal
                ref={bottomSheetRef}
                snapPoints={snapPoints}
                enablePanDownToClose={enablePanDownToClose}
                backgroundStyle={[styles.bottomSheetBackground, { backgroundColor }]}
                handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: handleColor }]}
                backdropComponent={renderBackdrop}
                onChange={handleSheetChanges}
            >
                <View style={styles.contentContainer}>
                    {title && (
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: textColor }]}>
                                {title}
                            </Text>
                        </View>
                    )}
                    <BottomSheetScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollViewContent}
                    >
                        {children}
                    </BottomSheetScrollView>
                </View>
            </BottomSheetModal>
        );
    }
);

BottomSheet.displayName = 'BottomSheet';

// =============================================================================
// Category Bottom Sheet Component (Backward Compatible)
// =============================================================================

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

/**
 * Category selection bottom sheet.
 * Maintains backward compatibility with existing usage in post.tsx and index.tsx.
 */
const CategoryBottomSheet = forwardRef<CategoryBottomSheetRefProps, CategoryBottomSheetProps>(
    ({ onCategorySelect, showCategories = true, children, title }, ref) => {
        const bottomSheetRef = useRef<BottomSheetModal>(null);
        const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

        const snapPoints = useMemo(() => ['50%', '75%', '90%'], []);

        // Theme colors
        const backgroundColor = useThemeColor({}, 'background');
        const textColor = useThemeColor({}, 'text');
        const iconColor = useThemeColor({}, 'icon');
        const itemBackground = useThemeColor({}, 'sheetItemBackground');
        const handleColor = useThemeColor({}, 'handleIndicator');
        const chevronColor = useThemeColor({}, 'iconMuted');

        useImperativeHandle(ref, () => ({
            open: () => {
                setSelectedCategory(null);
                bottomSheetRef.current?.present();
            },
            close: () => {
                bottomSheetRef.current?.dismiss();
                setTimeout(() => setSelectedCategory(null), 300);
            },
        }));

        const handleCategoryPress = useCallback((category: Category) => {
            setSelectedCategory(category);
            if (category.subcategories.length > 10) {
                bottomSheetRef.current?.snapToIndex(1);
            }
        }, []);

        const handleSubcategoryPress = useCallback(
            (subcategory: Subcategory) => {
                if (selectedCategory) {
                    onCategorySelect?.(selectedCategory, subcategory);
                    bottomSheetRef.current?.dismiss();
                    setTimeout(() => setSelectedCategory(null), 300);
                }
            },
            [selectedCategory, onCategorySelect]
        );

        const handleBackPress = useCallback(() => {
            setSelectedCategory(null);
            bottomSheetRef.current?.snapToIndex(0);
        }, []);

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

        const handleSheetChanges = useCallback((_index: number) => {
            // Sheet position changed
        }, []);

        const currentTitle = showCategories
            ? (selectedCategory ? selectedCategory.name : 'Select Category')
            : (title || 'Options');

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
                                <Text style={[styles.backButtonText, { color: BRAND_COLOR }]}>
                                    {'‹ Back'}
                                </Text>
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
                                        <Text style={[styles.categoryText, { color: textColor }]}>
                                            {subcategory.name}
                                        </Text>
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
                                            <Text style={[styles.categoryIcon, { color: iconColor }]}>
                                                {category.icon}
                                            </Text>
                                            <Text style={[styles.categoryText, { color: textColor }]}>
                                                {category.name}
                                            </Text>
                                        </View>
                                        <Text style={[styles.chevron, { color: chevronColor }]}>{'›'}</Text>
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

export default CategoryBottomSheet;

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
    bottomSheetBackground: {
        borderTopLeftRadius: BORDER_RADIUS.xxl,
        borderTopRightRadius: BORDER_RADIUS.xxl,
        ...SHADOWS.bottomSheet,
    },
    handleIndicator: {
        width: 40,
        height: 4,
        marginTop: SPACING.sm,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
    },
    scrollViewContent: {
        paddingBottom: SPACING.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        marginTop: SPACING.sm,
        minHeight: 32,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        zIndex: 1,
        padding: SPACING.sm,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
    },
    titleWithBack: {},
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        marginVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.lg,
    },
    categoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        fontSize: 20,
        marginRight: SPACING.md,
    },
    categoryText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    chevron: {
        fontSize: 24,
        marginLeft: SPACING.sm,
    },
});
