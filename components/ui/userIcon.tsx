import Feather from '@expo/vector-icons/Feather';
import { Pressable } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth_context';

export function UserIcon() {
    const { signOut } = useAuth();
    const iconColor = useThemeColor({}, 'icon');

    return (
        <Pressable onPress={signOut}>
            <Feather name="user" size={26} color={iconColor} />
        </Pressable>
    );
}