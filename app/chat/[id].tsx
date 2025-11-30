import { VoiceMessage } from '@/components/chat/voiceMessage';
import { VoiceRecorder } from '@/components/chat/voiceRecorder';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/lib/auth_context';
import { formatPrice, getDisplayName } from '@/lib/formatters';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { supabase } from '@/lib/supabase';
import { ConversationWithDetails, Message } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
    const params = useLocalSearchParams<{ id: string }>();
    const conversationId = params.id;
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
    const [conversationLoading, setConversationLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [isRecordingActive, setIsRecordingActive] = useState(false);
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const { messages, isLoading, isSending, sendMessage, sendAudioMessage } = useMessages(conversationId);
    const flatListRef = useRef<FlatList>(null);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');
    const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'text');
    const cardBg = useThemeColor({ light: '#fff', dark: '#1a1a1a' }, 'background');
    const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#2a2a2a' }, 'background');
    const myMessageBg = '#007AFF';
    const otherMessageBg = useThemeColor({ light: '#e5e5ea', dark: '#3a3a3c' }, 'background');

    useEffect(() => {
        const fetchConversation = async () => {
            if (!conversationId || !user) return;

            try {
                const { data: conv, error } = await supabase
                    .from('conversations')
                    .select(`
                        *,
                        listing:listings(id, title, price, currency, images, status)
                    `)
                    .eq('id', conversationId)
                    .single();

                if (error) throw error;

                if (conv) {
                    const otherUserId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, email, phone_number, display_name, avatar_url')
                        .eq('id', otherUserId)
                        .single();

                    const isBuyer = conv.buyer_id === user.id;

                    setConversation({
                        ...conv,
                        other_user: {
                            id: otherUserId,
                            display_name: getDisplayName(profile),
                            avatar_url: profile?.avatar_url || null
                        },
                        unread_count: isBuyer ? conv.buyer_unread_count : conv.seller_unread_count
                    });
                }
            } catch (error) {
                console.error('Error fetching conversation:', error);
            } finally {
                setConversationLoading(false);
            }
        };

        fetchConversation();
    }, [conversationId, user]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSubscription = Keyboard.addListener(showEvent, () => {
            setIsKeyboardVisible(true);
        });
        const hideSubscription = Keyboard.addListener(hideEvent, () => {
            setIsKeyboardVisible(false);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const handleSend = async () => {
        if (!messageText.trim() || isSending) return;

        const text = messageText.trim();
        setMessageText('');

        const success = await sendMessage(text);
        if (!success) {
            setMessageText(text);
        }
    };

    const handleVoiceSend = useCallback(async (uri: string, duration: number): Promise<boolean> => {
        const success = await sendAudioMessage(uri, duration);
        if (success) {
            setIsRecordingActive(false);
        }
        return success;
    }, [sendAudioMessage]);

    const handleVoiceCancel = useCallback(() => {
        setIsRecordingActive(false);
    }, []);

    const handleRecordingStateChange = useCallback((isActive: boolean) => {
        setIsRecordingActive(isActive);
    }, []);

    const handleAudioPlay = useCallback((messageId: string | null) => {
        setPlayingMessageId(messageId);
    }, []);

    const handleListingPress = () => {
        if (conversation?.listing?.id) {
            router.push(`/listing/${conversation.listing.id}`);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMyMessage = item.sender_id === user?.id;
        const showDateHeader = index === 0 ||
            new Date(item.created_at).toDateString() !==
            new Date(messages[index - 1].created_at).toDateString();
        const isAudioMessage = item.message_type === 'voice' && item.audio_url;

        return (
            <View>
                {showDateHeader && (
                    <View style={styles.dateHeader}>
                        <Text style={[styles.dateHeaderText, { color: secondaryTextColor }]}>
                            {formatDateHeader(item.created_at)}
                        </Text>
                    </View>
                )}
                <View style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
                ]}>
                    {isAudioMessage ? (
                        <View>
                            <VoiceMessage
                                messageId={item.id}
                                audioUrl={item.audio_url!}
                                duration={item.audio_duration || 0}
                                isOwnMessage={isMyMessage}
                                bubbleColor={isMyMessage ? myMessageBg : otherMessageBg}
                                textColor={isMyMessage ? 'white' : textColor}
                                playingMessageId={playingMessageId}
                                onPlay={handleAudioPlay}
                            />
                            <Text style={[
                                styles.audioMessageTime,
                                {
                                    color: secondaryTextColor,
                                    textAlign: isMyMessage ? 'right' : 'left'
                                }
                            ]}>
                                {formatTime(item.created_at)}
                            </Text>
                        </View>
                    ) : (
                        <View style={[
                            styles.messageBubble,
                            isMyMessage
                                ? { backgroundColor: myMessageBg }
                                : { backgroundColor: otherMessageBg }
                        ]}>
                            <Text style={[
                                styles.messageText,
                                { color: isMyMessage ? 'white' : textColor }
                            ]}>
                                {item.content}
                            </Text>
                            <Text style={[
                                styles.messageTime,
                                { color: isMyMessage ? 'rgba(255,255,255,0.7)' : secondaryTextColor }
                            ]}>
                                {formatTime(item.created_at)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (conversationLoading || isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            </SafeAreaView>
        );
    }

    if (!conversation) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={styles.errorContainer}>
                    <ThemedText>Conversation not found</ThemedText>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <Pressable onPress={() => router.back()} style={styles.backIconButton}>
                        <Ionicons name="chevron-back" size={28} color="#007AFF" />
                    </Pressable>

                    <Pressable style={styles.headerContent} onPress={handleListingPress}>
                        {conversation.listing?.images?.[0] ? (
                            <Image
                                source={{ uri: getThumbnailUrl(conversation.listing.images[0], 80, 80) }}
                                style={styles.headerImage}
                            />

                        ) : (
                            <View style={[styles.headerImagePlaceholder, { backgroundColor: borderColor }]}>
                                <Ionicons name="image-outline" size={20} color={secondaryTextColor} />
                            </View>
                        )}
                        <View style={styles.headerTextContainer}>
                            <Text style={[styles.headerName, { color: textColor }]} numberOfLines={1}>
                                {conversation.other_user.display_name}
                            </Text>
                            <Text style={[styles.headerListing, { color: secondaryTextColor }]} numberOfLines={1}>
                                {conversation.listing?.title}
                            </Text>
                        </View>
                    </Pressable>
                </View>

                {/* Listing Preview */}
                <Pressable
                    style={[styles.listingPreview, { backgroundColor: cardBg, borderBottomColor: borderColor }]}
                    onPress={handleListingPress}
                >
                    {conversation.listing?.images?.[0] && (
                        <Image
                            source={{ uri: getThumbnailUrl(conversation.listing.images[0], 120, 120) }}
                            style={styles.previewImage}
                        />
                    )}
                    <View style={styles.previewDetails}>
                        <Text style={[styles.previewTitle, { color: textColor }]} numberOfLines={1}>
                            {conversation.listing?.title}
                        </Text>
                        <Text style={[styles.previewPrice, { color: textColor }]}>
                            {conversation.listing ? formatPrice(conversation.listing.price, conversation.listing.currency) : ''}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
                </Pressable>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    ListEmptyComponent={
                        <View style={styles.emptyMessages}>
                            <Text style={[styles.emptyMessagesText, { color: secondaryTextColor }]}>
                                No messages yet. Start the conversation!
                            </Text>
                        </View>
                    }
                />

                {/* Input - Single VoiceRecorder instance to prevent state reset */}
                <View style={[
                    styles.inputContainer,
                    {
                        backgroundColor: cardBg,
                        borderTopColor: borderColor
                    }
                ]}>
                    {/* TextInput - hidden when recording */}
                    {!isRecordingActive && (
                        <TextInput
                            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                            placeholder="Type a message..."
                            placeholderTextColor={secondaryTextColor}
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                            maxLength={1000}
                        />
                    )}

                    {/* Send button - only when there's text and not recording */}
                    {!isRecordingActive && messageText.trim() ? (
                        <Pressable
                            style={styles.sendButton}
                            onPress={handleSend}
                            disabled={isSending}
                        >
                            <Ionicons name="send" size={20} color="white" />
                        </Pressable>
                    ) : (
                        /* Single VoiceRecorder - always the same instance */
                        <View style={isRecordingActive ? styles.recordingContainer : undefined}>
                            <VoiceRecorder
                                onSend={handleVoiceSend}
                                onCancel={handleVoiceCancel}
                                onStateChange={handleRecordingStateChange}
                                accentColor="#007AFF"
                                backgroundColor={inputBg}
                                textColor={textColor}
                            />
                        </View>
                    )}
                </View>
                {/* Bottom safe area spacer - only when keyboard is hidden */}
                {!isKeyboardVisible && insets.bottom > 0 && (
                    <View style={{ height: insets.bottom, backgroundColor }} />
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardAvoid: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backButton: {
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    backIconButton: {
        padding: 4,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 4,
    },
    headerImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 10,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerListing: {
        fontSize: 13,
        marginTop: 1,
    },
    listingPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    previewImage: {
        width: 50,
        height: 50,
        borderRadius: 6,
    },
    previewDetails: {
        flex: 1,
        marginLeft: 12,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    previewPrice: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 2,
    },
    messagesList: {
        padding: 16,
        flexGrow: 1,
    },
    emptyMessages: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyMessagesText: {
        fontSize: 15,
        textAlign: 'center',
    },
    dateHeader: {
        alignItems: 'center',
        marginVertical: 16,
    },
    dateHeaderText: {
        fontSize: 12,
        fontWeight: '500',
    },
    messageContainer: {
        marginVertical: 2,
    },
    myMessageContainer: {
        alignItems: 'flex-end',
    },
    otherMessageContainer: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 8,
        borderTopWidth: 1,
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        fontSize: 16,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    recordingContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    audioMessageTime: {
        fontSize: 11,
        marginTop: 4,
        paddingHorizontal: 4,
    },
});