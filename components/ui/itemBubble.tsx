import { Alert, Image, Pressable, ScrollView, StyleSheet } from 'react-native';

export function ItemBubble() {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}>
            <Pressable onPress={() => Alert.alert('Image pressed!')} style={styles.imageButton}>
                <Image
                    source={require('../../assets/images/Chat.png')}
                    style={styles.image}
                />
            </Pressable>
            <Pressable onPress={() => Alert.alert('Image pressed!')} style={styles.imageButton}>
                <Image
                    source={require('../../assets/images/Chat.png')}
                    style={styles.image}
                />
            </Pressable>
            <Pressable onPress={() => Alert.alert('Image pressed!')} style={styles.imageButton}>
                <Image
                    source={require('../../assets/images/Chat.png')}
                    style={styles.image}
                />
            </Pressable>
            <Pressable onPress={() => Alert.alert('Image pressed!')} style={styles.imageButton}>
                <Image
                    source={require('../../assets/images/Chat.png')}
                    style={styles.image}
                />
            </Pressable>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    imageButton: {
        padding: 10,
    },
    image: {
        width: 100,
        height: 100,
        resizeMode: 'contain',
    },
});