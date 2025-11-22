// components/ui/itemBubble.tsx
import { FontAwesome5, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface CategoryItem {
  id: string;
  name: string;
  icon: ReactNode;
}

const categoryData: CategoryItem[] = [
  {
    id: 'buy-sell',
    name: 'Buy & Sell',
    icon: <MaterialIcons name="shopping-cart" size={40} color="white" />
  },
  {
    id: 'cars',
    name: 'Cars',
    icon: <FontAwesome5 name="car" size={36} color="white" />
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: <MaterialCommunityIcons name="home" size={40} color="white" />
  },
  {
    id: 'jobs',
    name: 'Jobs',
    icon: <MaterialIcons name="work" size={40} color="white" />
  },
  {
    id: 'services',
    name: 'Services',
    icon: <MaterialIcons name="build" size={40} color="white" />
  },
  {
    id: 'pets',
    name: 'Pets',
    icon: <MaterialCommunityIcons name="paw" size={40} color="white" />
  }
];

export function ItemBubble() {
  const handleCategoryPress = (category: CategoryItem) => {
    // Navigate to the category page with the category id and name
    router.push({
      pathname: '/category/[id]',
      params: { 
        id: category.id, 
        name: category.name 
      }
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {categoryData.map((category) => (
        <Pressable
          key={category.id}
          onPress={() => handleCategoryPress(category)}
          style={({ pressed }) => [
            styles.categoryButton,
            pressed && styles.categoryButtonPressed
          ]}>
          <View style={styles.iconContainer}>
            {category.icon}
          </View>
          <Text style={styles.categoryName}>{category.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});