import { ThemedView } from '@/components/themed-view';
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
  
  const handleCurrencyPress = () => {
    // Toggle between SYP and USD
    setCurrency(currency === 'SYP' ? 'USD' : 'SYP');
  };

  return (
    <ThemedView style={styles.section}>
      <Text style={styles.sectionTitle}>Price</Text>
      <View style={styles.priceContainer}>
        <TouchableOpacity 
          style={styles.currencyButton}
          onPress={handleCurrencyPress}
          activeOpacity={0.7}
        >
          <Text style={styles.currencyText}>{currency}</Text>
          <Fontisto name="arrow-swap" size={14} color="white" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.priceInput}
          placeholder="0.00"
          placeholderTextColor="#888"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
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
    marginHorizontal: 20,
    marginBottom: 25,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  currencyText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    color: 'white',
    borderWidth: 1,
    borderColor: '#333',
  },
});