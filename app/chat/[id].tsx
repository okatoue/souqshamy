import { VoiceMessage } from '@/components/chat/voiceMessage';
import { VoiceRecorder } from '@/components/chat/voiceRecorder';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/lib/auth_context';
import { formatPrice, getDisplayName } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { ConversationWithDetails, Message } from '@/types/chat';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
    const params = useLocalSearchParams<{ id: string }>();
    const conversationId = params.id;
    const { user } = useAuth();
    const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
    const [conversationLoading, setConversationLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [isRecordingActive, setIsRecordingActive] = useState(false);
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

    const { messages, isLoading, isSending, sendMessage, sendAudioMessage, retryMessage, deleteFailedMessage } = useMessages(conversationId);
    const flatListRef = useRef<FlatList>(null);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const secondaryTextColor = useThemeColor({}, 'textSecondary');
    const borderColor = useThemeColor({}, 'border');
    const cardBg = useThemeColor({}, 'cardBackground');
    const inputBg = useThemeColor({}, 'inputBackground');
    // Chat bubble colors from theme
    const myMessageBg = useThemeColor({}, 'chatBubbleMine');
    const otherMessageBg = useThemeColor({}, 'chatBubbleOther');
    const myTextColor = useThemeColor({}, 'chatTextMine');
    const otherTextColor = useThemeColor({}, 'chatTextOther');
    const errorColor = '#FF3B30';

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

    // Note: Scroll to bottom is handled by FlatList's onContentSizeChange

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

    const handleRetry = useCallback(async (messageId: string) => {
        await retryMessage(messageId);
    }, [retryMessage]);

    const handleDeleteFailed = useCallback((messageId: string) => {
        deleteFailedMessage(messageId);
    }, [deleteFailedMessage]);

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMyMessage = item.sender_id === user?.id;
        const showDateHeader = index === 0 ||
            new Date(item.created_at).toDateString() !==
            new Date(messages[index - 1].created_at).toDateString();
        const isAudioMessage = item.message_type === 'voice' && item.audio_url;
        const isSendingMessage = item._status === 'sending';
        const isFailedMessage = item._status === 'failed';

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
                        <View style={isFailedMessage ? styles.failedMessageWrapper : undefined}>
                            <View style={isFailedMessage ? [styles.failedBubbleOverlay] : undefined}>
                                <VoiceMessage
                                    messageId={item.id}
                                    audioUrl={item.audio_url!}
                                    duration={item.audio_duration || 0}
                                    isOwnMessage={isMyMessage}
                                    bubbleColor={isFailedMessage ? errorColor : (isMyMessage ? myMessageBg : otherMessageBg)}
                                    textColor={isMyMessage ? myTextColor : otherTextColor}
                                    playingMessageId={playingMessageId}
                                    onPlay={handleAudioPlay}
                                />
                            </View>
                            <View style={[styles.messageStatusRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
                                {isSendingMessage && (
                                    <ActivityIndicator size="small" color={secondaryTextColor} style={styles.statusIndicator} />
                                )}
                                {isFailedMessage && (
                                    <View style={styles.failedActions}>
                                        <Pressable onPress={() => handleRetry(item.id)} style={styles.retryButton}>
                                            <Ionicons name="refresh" size={14} color={errorColor} />
                                            <Text style={[styles.retryText, { color: errorColor }]}>Retry</Text>
                                        </Pressable>
                                        <Pressable onPress={() => handleDeleteFailed(item.id)} style={styles.deleteButton}>
                                            <Ionicons name="trash-outline" size={14} color={secondaryTextColor} />
                                        </Pressable>
                                    </View>
                                )}
                                {!isSendingMessage && !isFailedMessage && (
                                    <Text style={[styles.audioMessageTime, { color: secondaryTextColor }]}>
                                        {formatTime(item.created_at)}
                                    </Text>
                                )}
                            </View>
                            {isFailedMessage && (
                                <Text style={[styles.failedText, { color: errorColor, textAlign: isMyMessage ? 'right' : 'left' }]}>
                                    Failed to send
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={isFailedMessage ? styles.failedMessageWrapper : undefined}>
                            <View style={[
                                styles.messageBubble,
                                isMyMessage
                                    ? { backgroundColor: isFailedMessage ? errorColor : myMessageBg }
                                    : { backgroundColor: otherMessageBg },
                                isFailedMessage && styles.failedBubble
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    { color: isMyMessage ? myTextColor : otherTextColor }
                                ]}>
                                    {item.content}
                                </Text>
                                <View style={styles.messageStatusRow}>
                                    {isSendingMessage && (
                                        <ActivityIndicator size="small" color={isMyMessage ? 'rgba(255,255,255,0.7)' : secondaryTextColor} style={styles.statusIndicator} />
                                    )}
                                    {!isSendingMessage && !isFailedMessage && (
                                        <Text style={[
                                            styles.messageTime,
                                            { color: isMyMessage ? 'rgba(255,255,255,0.7)' : secondaryTextColor }
                                        ]}>
                                            {formatTime(item.created_at)}
                                        </Text>
                                    )}
                                    {isFailedMessage && (
                                        <Ionicons name="alert-circle" size={14} color="rgba(255,255,255,0.9)" />
                                    )}
                                </View>
                            </View>
                            {isFailedMessage && (
                                <View style={[styles.failedActions, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
                                    <Pressable onPress={() => handleRetry(item.id)} style={styles.retryButton}>
                                        <Ionicons name="refresh" size={14} color={errorColor} />
                                        <Text style={[styles.retryText, { color: errorColor }]}>Retry</Text>
                                    </Pressable>
                                    <Pressable onPress={() => handleDeleteFailed(item.id)} style={styles.deleteButton}>
                                        <Ionicons name="trash-outline" size={14} color={secondaryTextColor} />
                                    </Pressable>
                                </View>
                            )}
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
        <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <Pressable onPress={() => router.back()} style={styles.backIconButton}>
                        <Ionicons name="chevron-back" size={28} color="#007AFF" />
                    </Pressable>

                    <View style={styles.headerContent}>
                        {conversation.other_user.avatar_url ? (
                            <Image
                                source={{ uri: conversation.other_user.avatar_url }}
                                style={styles.headerAvatar}
                            />
                        ) : (
                            <MaterialCommunityIcons name="account-circle" size={40} color={secondaryTextColor} />
                        )}
                        <Text style={[styles.headerName, { color: textColor }]} numberOfLines={1}>
                            {conversation.other_user.display_name}
                        </Text>
                    </View>
                </View>

                {/* Listing Preview */}
                <Pressable
                    style={[styles.listingPreview, { backgroundColor: cardBg, borderBottomColor: borderColor }]}
                    onPress={handleListingPress}
                >
                    {conversation.listing?.images?.[0] && (
                        <Image
                            source={{ uri: conversation.listing.images[0] }}
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
                        borderTopColor: borderColor,
                        paddingBottom: 8
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
                            accessibilityLabel="Message input"
                            accessibilityHint="Type a message to send"
                        />
                    )}

                    {/* Send button - only when there's text and not recording */}
                    {!isRecordingActive && messageText.trim() ? (
                        <Pressable
                            style={styles.sendButton}
                            onPress={handleSend}
                            disabled={isSending}
                            accessibilityRole="button"
                            accessibilityLabel="Send message"
                            accessibilityState={{ disabled: isSending }}
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
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    headerName: {
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 10,
        flex: 1,
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
    // Failed message styles
    failedMessageWrapper: {
        maxWidth: '80%',
    },
    failedBubble: {
        opacity: 0.9,
    },
    failedBubbleOverlay: {
        opacity: 0.9,
    },
    failedText: {
        fontSize: 11,
        marginTop: 2,
        paddingHorizontal: 4,
    },
    failedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        gap: 4,
    },
    retryText: {
        fontSize: 12,
        fontWeight: '500',
    },
    deleteButton: {
        padding: 4,
    },
    messageStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    statusIndicator: {
        marginLeft: 4,
    },
});