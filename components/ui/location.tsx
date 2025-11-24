import { useThemeColor } from '@/hooks/use-theme-color';
import Entypo from '@expo/vector-icons/Entypo';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';

export function Location() {
    const iconColor = useThemeColor({}, 'icon');
    const textColor = useThemeColor({}, 'text');

    return (
        <Pressable onPress={() => Alert.alert('Location pressed!')} style={styles.locationBar}>
            <ThemedText style={[styles.locationText, { color: textColor }]}>Mneen</ThemedText>
            <Entypo name="location-pin" size={28} color={iconColor} />
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
