import { ThemedView } from '@/components/themed-view';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatPriceInput } from '@/lib/formatters';
import { Fontisto } from '@expo/vector-icons';
import React from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PriceSectionProps {
  price: string;
  setPrice: (price: string) => void;
  currency: string;
  setCurrency: (currency: string) => void;
}

export default function PriceSection({
  price,
  setPrice,
  currency,
  setCurrency
}: PriceSectionProps) {
  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const inputBg = useThemeColor({}, 'inputBackground');

  const handleCurrencyPress = () => {
    // Toggle between SYP and USD
    setCurrency(currency === 'SYP' ? 'USD' : 'SYP');
  };

  const handlePriceChange = (text: string) => {
    const formatted = formatPriceInput(text);
    setPrice(formatted);
  };

  return (
    <ThemedView variant="card" style={[styles.section, { borderColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Price</Text>
      <View style={styles.priceContainer}>
        <TouchableOpacity
          style={[styles.currencyButton, { backgroundColor: inputBg, borderColor }]}
          onPress={handleCurrencyPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.currencyText, { color: textColor }]}>{currency}</Text>
          <Fontisto name="arrow-swap" size={14} color={textColor} />
        </TouchableOpacity>

        <TextInput
          style={[styles.priceInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
          placeholder="0.00"
          placeholderTextColor={COLORS.placeholder}
          keyboardType="decimal-pad"
          value={price}
          onChangeText={handlePriceChange}
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceInput: {
    flex: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: 20,
    borderWidth: 1,
  },
});
