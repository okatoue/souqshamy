import Entypo from '@expo/vector-icons/Entypo';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';

export function Location() {
    return (
        <Pressable onPress={() => Alert.alert('Location pressed!')} style={styles.locationBar}>
            <ThemedText style={styles.locationText}>Mneen</ThemedText>
            <Entypo name="location-pin" size={28} color="white" />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    locationBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    locationText: {
        color: 'white',
        fontSize: 20,
        marginTop: 2,
        marginRight: 5,
    }
})
