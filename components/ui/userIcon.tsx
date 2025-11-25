import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export function UserIcon() {
    const router = useRouter();
    const iconColor = useThemeColor({}, 'icon');

    return (
        <Pressable onPress={() => router.push('/user')}>
            <Feather name="user" size={26} color={iconColor} />
        </Pressable>
    );
}