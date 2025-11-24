import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CategoriesList } from '@/components/ui/CategoriesList';
import { Location } from '@/components/ui/location';
import { SearchBar } from '@/components/ui/SearchBar';
import { UserIcon } from '@/components/ui/userIcon';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  //souqJirana.com
  //bay3o.com
  //KulshiAds.com
  //SouqJama3a.com
  //LelBay3.com
  //yallahbe3.com
  //souqshami.com
  const backgroundColor = useThemeColor({}, 'background');
  const searchContainerBg = useThemeColor({ light: '#f0f0f0', dark: '#1a1a1a' }, 'background');
  const searchContainerBorder = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'icon');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView>
        <View style={styles.headerRow}>
          <UserIcon />
          <Location />
        </View>

        <ThemedView style={[styles.searchContainer, { backgroundColor: searchContainerBg, borderColor: searchContainerBorder }]}>
          <SearchBar
            style={styles.searchBarContent} />
        </ThemedView>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Popular Categories</ThemedText>
        </ThemedView>

        <CategoriesList />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginTop: 5,
    marginBottom: 25,
    marginLeft: 20,
    marginRight: 20,
    height: 50,
    borderWidth: 1,
    paddingLeft: 8,
    borderRadius: 30,
    fontSize: 40,
  },
  searchBarContent: {
    marginTop: 8,
    marginLeft: 20,
    fontSize: 18,
  },
  container: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 16,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  imageButton: {
    padding: 10,
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
