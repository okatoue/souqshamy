import { ThemedText } from '@/components/themed-text';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Category, Subcategory } from '@/assets/categories';
import CategoryBottomSheet, { CategoryBottomSheetRefProps } from '@/components/ui/bottomSheet';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getCategoryTranslation, getSubcategoryTranslation } from '@/lib/categoryTranslations';
import { useRTL } from '@/lib/rtl_context';
import { rtlRow, rtlTextAlign } from '@/lib/rtlStyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { UserIcon } from '../../components/ui/userIcon';


export default function PostListingScreen() {
  const { t } = useTranslation();
  const { isRTL } = useRTL();
  const [listingTitle, setListingTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  const categorySheetRef = useRef<CategoryBottomSheetRefProps>(null);
  const router = useRouter();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#888', dark: '#aaa' }, 'text');
  const borderColor = useThemeColor({ light: '#ccc', dark: '#444' }, 'icon');
  const buttonColor = useThemeColor({}, 'tint');
  const disabledButtonColor = useThemeColor({ light: '#ccc', dark: '#444' }, 'icon');

  const handleOpenPress = () => {
    Keyboard.dismiss();
    categorySheetRef.current?.open();
  };

  const handleCategorySelect = (category: Category, subcategory: Subcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
  };

  const handleContinue = () => {
    // Validate that required fields are filled
    if (!listingTitle.trim()) {
      Alert.alert(t('alerts.error'), t('post.missingTitle'));
      return;
    }

    if (!selectedCategory || !selectedSubcategory) {
      Alert.alert(t('alerts.error'), t('post.missingCategory'));
      return;
    }

    // Navigate to product details page with numeric IDs!
    router.push({
      pathname: '/product-details',
      params: {
        title: listingTitle,
        categoryId: selectedCategory.id,         // Numeric ID
        subcategoryId: selectedSubcategory.id,   // Numeric ID
        categoryName: selectedCategory.name,     // For display
        subcategoryName: selectedSubcategory.name, // For display
        categoryIcon: selectedCategory.icon
      }
    });
  };

  // Format the selected category for display
  const getCategoryDisplayText = () => {
    if (selectedCategory && selectedSubcategory) {
      const catName = getCategoryTranslation(selectedCategory.id, t);
      const subName = getSubcategoryTranslation(selectedSubcategory.id, t);
      // Use RTL-aware separator
      return isRTL
        ? `${selectedCategory.icon} ${subName} ‹ ${catName}`
        : `${selectedCategory.icon} ${catName} › ${subName}`;
    }
    return t('post.selectCategory');
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor }]}
          >
            <View style={styles.headerRow}>
              <UserIcon />
            </View>

            <View style={styles.titleContainer}>
              <ThemedText type="title">{t('post.postListing')}</ThemedText>
            </View>

            <View style={[styles.listingContainer, { borderColor }]}>
              <TextInput
                placeholder={t('post.titlePlaceholder')}
                value={listingTitle}
                onChangeText={setListingTitle}
                style={[styles.listingTitleContent, rtlTextAlign(isRTL), { color: textColor }]}
                placeholderTextColor={placeholderColor}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            <TouchableOpacity
              style={[styles.categoryButton, { borderColor }]}
              onPress={handleOpenPress}
              activeOpacity={0.8}
            >
              <View style={[styles.categoryButtonContent, rtlRow(isRTL)]}>
                <Text style={[
                  styles.categoryButtonText,
                  rtlTextAlign(isRTL),
                  { color: selectedCategory ? textColor : placeholderColor }
                ]}>
                  {getCategoryDisplayText()}
                </Text>
                <Ionicons
                  name={isRTL ? "chevron-back" : "chevron-forward"}
                  size={20}
                  color={placeholderColor}
                />
              </View>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: (!listingTitle || !selectedCategory) ? disabledButtonColor : buttonColor }
              ]}
              onPress={handleContinue}
              activeOpacity={0.8}
              disabled={!listingTitle || !selectedCategory}
            >
              <Text style={styles.continueButtonText}>{t('post.continue')}</Text>
            </TouchableOpacity>

            <CategoryBottomSheet
              ref={categorySheetRef}
              onCategorySelect={handleCategorySelect}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listingContainer: {
    marginTop: 100,
    marginBottom: 25,
    marginHorizontal: 20,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  listingTitleContent: {
    fontSize: 18,
    paddingHorizontal: 12,
  },
  container: {
    flex: 1,
  },
  titleContainer: {
    marginTop: 100,
    marginHorizontal: 16,
  },
  categoryButton: {
    marginTop: 50,
    marginBottom: 25,
    marginHorizontal: 20,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  categoryButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: 16,
    flex: 1,
  },
  continueButton: {
    marginTop: 30,
    marginHorizontal: 20,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});