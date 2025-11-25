import { useThemeColor } from '@/hooks/use-theme-color';
import Entypo from '@expo/vector-icons/Entypo';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';

export function Location() {
    const iconColor = useThemeColor({}, 'icon');
    const textColor = useThemeColor({}, 'text');

    return (
        <View style={styles.locationBar}>
            <View>
                <ThemedText style={[styles.locationText, { color: textColor }]}>Mneen</ThemedText>
            </View>
            <Pressable onPress={() => Alert.alert('Location pressed!')}>
                <Entypo name="location-pin" size={28} color={iconColor} />
            </Pressable>
        </View>
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
        marginLeft: 5,
    }
})
