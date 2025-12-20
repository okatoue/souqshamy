import { useThemeColor } from '@/hooks/use-theme-color';
import { useProfile } from '@/hooks/userProfile';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

export function UserIcon() {
    const router = useRouter();
    const iconColor = useThemeColor({}, 'icon');
    const { profile } = useProfile();

    return (
        <Pressable
            onPress={() => router.push('/user')}
            style={styles.container}
            accessibilityLabel="Open account menu"
            accessibilityRole="button"
            accessibilityHint="Navigate to your account settings and profile"
        >
            {profile?.avatar_url ? (
                <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                    accessibilityIgnoresInvertColors
                />
            ) : (
                <View style={styles.iconWrapper}>
                    <MaterialCommunityIcons name="account-circle" size={30} color={iconColor} />
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    iconWrapper: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
