import Feather from '@expo/vector-icons/Feather';
import { Pressable } from 'react-native';

import { useAuth } from '@/lib/auth_context';

export function UserIcon() {
    const { signOut } = useAuth();

    return (
        <Pressable onPress={signOut}>
            <Feather name="user" size={26} color="white" />
        </Pressable>
    );
}