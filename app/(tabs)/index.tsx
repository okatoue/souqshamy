import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SearchBar } from '@/components/ui/SearchBar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ItemBubble } from '../../components/ui/itemBubble';

import { Location } from '../../components/ui/location';
import { UserIcon } from '../../components/ui/userIcon';

export default function HomeScreen() {
//souqJirana.com
//bay3o.com
//KulshiAds.com
//SouqJama3a.com
//LelBay3.com
//yallahbe3.com
//souqshami.com
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerRow}>
          <UserIcon />
          <Location />
        </View>

        <ThemedView style={styles.searchContainer}>
          <SearchBar
            style={styles.searchBarContent} />
        </ThemedView>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Popular Categories</ThemedText>
        </ThemedView>

        <ItemBubble />

        <ThemedView style={styles.stepContainer}>

          <ThemedText type="subtitle">
            Step 3: Get a fresh start
          </ThemedText>

          <ThemedText>
            {`When you're ready, run `}
            <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
            <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
            <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
            <ThemedText type="defaultSemiBold">app-example</ThemedText>.
          </ThemedText>

        </ThemedView>

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
    borderColor: 'white',
    borderWidth: 1,
    paddingLeft: 8,
    borderRadius: 30,
    color: 'white',
    fontSize: 40,
  },
  searchBarContent: {
    marginTop: 8,
    marginLeft: 20,
    fontSize: 18,
    color: 'white',
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
