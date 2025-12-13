import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types/chat';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
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

    // Send a message
    const sendMessage = useCallback(async (content: string): Promise<boolean> => {
        if (!conversationId || !user || !content.trim()) return false;

        // Create optimistic message to show immediately
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: conversationId,
            sender_id: user.id,
            content: content.trim(),
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
                    content: content.trim()
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

    // Send an audio message
    const sendAudioMessage = useCallback(async (uri: string, duration: number): Promise<boolean> => {
        if (!conversationId || !user) return false;

        console.log('[VoiceMessage] Starting send process...');
        console.log('[VoiceMessage] URI:', uri);
        console.log('[VoiceMessage] Duration:', duration);

        // Create optimistic message to show immediately
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: conversationId,
            sender_id: user.id,
            content: '',
            message_type: 'voice',
            audio_url: uri, // Use local URI temporarily
            audio_duration: duration,
            is_read: false,
            created_at: new Date().toISOString()
        };

        // Add message to state immediately (optimistic update)
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            setIsSending(true);

            // Read file as base64
            console.log('[VoiceMessage] Reading file as base64...');
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            console.log('[VoiceMessage] Base64 length:', base64.length);

            // Generate unique filename
            const filename = `${conversationId}/${user.id}_${Date.now()}.m4a`;
            console.log('[VoiceMessage] Filename:', filename);

            // Upload to Supabase Storage
            console.log('[VoiceMessage] Starting upload to voice-messages bucket...');
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('voice-messages')
                .upload(filename, decode(base64), {
                    contentType: 'audio/mp4',
                    upsert: false,
                });

            if (uploadError) {
                console.error('[VoiceMessage] Upload error:', uploadError);
                throw uploadError;
            }
            console.log('[VoiceMessage] Upload successful:', uploadData.path);

            // Get public URL for the uploaded audio
            const { data: urlData } = supabase.storage
                .from('voice-messages')
                .getPublicUrl(uploadData.path);

            const audioUrl = urlData.publicUrl;
            console.log('[VoiceMessage] Public URL:', audioUrl);

            // Insert message record
            console.log('[VoiceMessage] Inserting message record...');
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content: '',
                    message_type: 'voice',
                    audio_url: audioUrl,
                    audio_duration: duration,
                })
                .select()
                .single();

            if (error) {
                console.error('[VoiceMessage] Message insert error:', error);
                throw error;
            }
            console.log('[VoiceMessage] Message inserted successfully:', data.id);

            // Replace optimistic message with real message from server
            if (data) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === optimisticMessage.id ? data : msg
                    )
                );
            }

            // Clean up local file
            try {
                await FileSystem.deleteAsync(uri, { idempotent: true });
            } catch {
                // Ignore cleanup errors
            }

            console.log('[VoiceMessage] Send complete!');
            return true;
        } catch (error) {
            console.error('[VoiceMessage] Error sending audio message:', error);
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
        sendAudioMessage,
        fetchMessages,
        markMessagesAsRead
    };
}