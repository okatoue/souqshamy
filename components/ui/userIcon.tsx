import Feather from '@expo/vector-icons/Feather';
import { Alert, Pressable } from 'react-native';

export function UserIcon() {
    return (
        <Pressable onPress={() => Alert.alert('Location pressed!')}>
            <Feather name="user" size={26} color="white" />
        </Pressable>
    );
}