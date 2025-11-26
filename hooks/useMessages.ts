import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types/chat';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';

export function useMessages(conversationId: string | null) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Fetch messages for the conversation
    const fetchMessages = useCallback(async () => {
        if (!conversationId || !user) {
            setMessages([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setMessages(data || []);

            // Mark messages as read
            await markMessagesAsRead();

        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, user]);

    // Mark messages as read
    const markMessagesAsRead = useCallback(async () => {
        if (!conversationId || !user) return;

        try {
            await supabase.rpc('mark_messages_as_read', {
                p_conversation_id: conversationId,
                p_user_id: user.id
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }, [conversationId, user]);

    // Send a text message
    const sendMessage = useCallback(async (content: string): Promise<boolean> => {
        if (!conversationId || !user || !content.trim()) return false;

        // Create optimistic message to show immediately
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: conversationId,
            sender_id: user.id,
            content: content.trim(),
            message_type: 'text',
            audio_url: null,
            audio_duration: null,
            is_read: false,
            created_at: new Date().toISOString()
        };

        // Add message to state immediately (optimistic update)
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            setIsSending(true);

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content: content.trim(),
                    message_type: 'text'
                })
                .select()
                .single();

            if (error) throw error;

            // Replace optimistic message with real message from server
            if (data) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === optimisticMessage.id ? data : msg
                    )
                );
            }

            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
            return false;
        } finally {
            setIsSending(false);
        }
    }, [conversationId, user]);

    // Send a voice message
    const sendVoiceMessage = useCallback(async (
        audioUri: string,
        duration: number
    ): Promise<boolean> => {
        if (!conversationId || !user) return false;

        // Create optimistic message
        const optimisticMessage: Message = {
            id: `temp-voice-${Date.now()}`,
            conversation_id: conversationId,
            sender_id: user.id,
            content: '🎤 Voice message',
            message_type: 'voice',
            audio_url: audioUri, // Use local URI temporarily
            audio_duration: duration,
            is_read: false,
            created_at: new Date().toISOString()
        };

        // Add optimistic message
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            setIsSending(true);

            console.log('Attempting to send voice message from URI:', audioUri);

            // Generate unique filename
            const fileName = `voice_${user.id}_${Date.now()}.m4a`;
            const filePath = `${conversationId}/${fileName}`;

            // Get Supabase URL and key for direct upload
            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

            // Get session for auth header
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            if (!accessToken) {
                throw new Error('No access token available');
            }

            // Upload using FileSystem.uploadAsync (works with local file URIs)
            const uploadResult = await FileSystem.uploadAsync(
                `${supabaseUrl}/storage/v1/object/voice-messages/${filePath}`,
                audioUri,
                {
                    httpMethod: 'POST',
                    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'audio/m4a',
                        'x-upsert': 'false',
                    },
                }
            );

            console.log('Upload result:', uploadResult.status, uploadResult.body);

            if (uploadResult.status !== 200) {
                throw new Error(`Upload failed: ${uploadResult.status} - ${uploadResult.body}`);
            }

            // Get public URL
            const { data: urlData } = supabase
                .storage
                .from('voice-messages')
                .getPublicUrl(filePath);

            const audioUrl = urlData.publicUrl;
            console.log('Upload successful, public URL:', audioUrl);

            // Insert message with audio URL
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content: '🎤 Voice message',
                    message_type: 'voice',
                    audio_url: audioUrl,
                    audio_duration: duration
                })
                .select()
                .single();

            if (error) throw error;

            // Replace optimistic message
            if (data) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === optimisticMessage.id ? data : msg
                    )
                );
            }

            return true;
        } catch (error) {
            console.error('Error sending voice message:', error);
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
            return false;
        } finally {
            setIsSending(false);
        }
    }, [conversationId, user]);

    // Initial fetch
    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Subscribe to real-time message updates
    useEffect(() => {
        if (!conversationId || !user) return;

        const subscription = supabase
            .channel(`messages-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    const newMessage = payload.new as Message;

                    // Only add if not already in state (avoid duplicates from optimistic update)
                    setMessages(prev => {
                        const exists = prev.some(msg => msg.id === newMessage.id);
                        if (exists) return prev;
                        return [...prev, newMessage];
                    });

                    // Mark as read if not from current user
                    if (newMessage.sender_id !== user.id) {
                        markMessagesAsRead();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [conversationId, user, markMessagesAsRead]);

    return {
        messages,
        isLoading,
        isSending,
        sendMessage,
        sendVoiceMessage,
        fetchMessages,
        markMessagesAsRead
    };
}