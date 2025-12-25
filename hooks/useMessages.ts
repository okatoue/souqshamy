import { useAuth } from '@/lib/auth_context';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types/chat';
import NotificationService from '@/lib/notifications/NotificationService';
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

        // Generate unique temp ID for tracking
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create optimistic message to show immediately
        const optimisticMessage: Message = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: user.id,
            content: content.trim(),
            is_read: false,
            created_at: new Date().toISOString(),
            message_type: 'text',
            _status: 'sending'
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

            // Replace optimistic message with real message from server (status becomes 'sent')
            if (data) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === tempId ? { ...data, _status: 'sent' as const } : msg
                    )
                );
            }

            // Trigger instant push notification delivery (fire-and-forget)
            NotificationService.processPendingNotifications(10).catch(() => {});

            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            // Mark message as failed instead of removing
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === tempId
                        ? { ...msg, _status: 'failed' as const, _error: errorMessage }
                        : msg
                )
            );
            return false;
        } finally {
            setIsSending(false);
        }
    }, [conversationId, user]);

    // Send an audio message
    const sendAudioMessage = useCallback(async (uri: string, duration: number): Promise<boolean> => {
        if (!conversationId || !user) return false;

        // Generate unique temp ID for tracking
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create optimistic message to show immediately
        const optimisticMessage: Message = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: user.id,
            content: '',
            message_type: 'voice',
            audio_url: uri, // Use local URI temporarily
            audio_duration: duration,
            is_read: false,
            created_at: new Date().toISOString(),
            _status: 'sending',
            _localUri: uri // Store for retry
        };

        // Add message to state immediately (optimistic update)
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            setIsSending(true);

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Generate unique filename
            const filename = `${conversationId}/${user.id}_${Date.now()}.m4a`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('voice-messages')
                .upload(filename, decode(base64), {
                    contentType: 'audio/mp4',
                    upsert: false,
                });

            if (uploadError) {
                throw uploadError;
            }

            // Store the storage path (not signed URL) - VoiceMessage component generates signed URLs on-demand
            // This allows for shorter-lived URLs that refresh when messages are viewed
            const storagePath = uploadData.path;

            // Insert message record with storage path
            const { data, error } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content: '',
                    message_type: 'voice',
                    audio_url: storagePath, // Store path, not signed URL
                    audio_duration: duration,
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Replace optimistic message with real message from server (status becomes 'sent')
            if (data) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === tempId ? { ...data, _status: 'sent' as const } : msg
                    )
                );
            }

            // Clean up local file after successful send
            try {
                await FileSystem.deleteAsync(uri, { idempotent: true });
            } catch {
                // Ignore cleanup errors
            }

            // Trigger instant push notification delivery (fire-and-forget)
            NotificationService.processPendingNotifications(10).catch(() => {});

            return true;
        } catch (error) {
            console.error('[VoiceMessage] Error sending audio message:', error);
            // Mark message as failed instead of removing (keeps local URI for retry)
            const errorMessage = error instanceof Error ? error.message : 'Failed to send voice message';
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === tempId
                        ? { ...msg, _status: 'failed' as const, _error: errorMessage }
                        : msg
                )
            );
            return false;
        } finally {
            setIsSending(false);
        }
    }, [conversationId, user]);

    // Initial fetch
    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Retry sending a failed message
    const retryMessage = useCallback(async (messageId: string): Promise<boolean> => {
        const failedMessage = messages.find(m => m.id === messageId && m._status === 'failed');
        if (!failedMessage) {
            return false;
        }

        // Remove the failed message from state first
        setMessages(prev => prev.filter(m => m.id !== messageId));

        // Retry based on message type
        if (failedMessage.message_type === 'voice' && failedMessage._localUri) {
            return sendAudioMessage(failedMessage._localUri, failedMessage.audio_duration || 0);
        } else {
            return sendMessage(failedMessage.content);
        }
    }, [messages, sendMessage, sendAudioMessage]);

    // Delete a failed message without retrying
    const deleteFailedMessage = useCallback((messageId: string): void => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
    }, []);

    // Subscribe to real-time message updates
    useEffect(() => {
        if (!conversationId || !user) return;

        const channel = supabase
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
                        // Check if message already exists by ID
                        const existsById = prev.some(msg => msg.id === newMessage.id);
                        if (existsById) {
                            return prev;
                        }

                        // Check if there's a temp message that matches (optimistic update)
                        // Match by sender, content (for text) or message_type (for voice),
                        // and timestamp proximity (within 10 seconds)
                        const tempMessageIndex = prev.findIndex(msg => {
                            if (!msg.id.startsWith('temp-')) return false;
                            if (msg.sender_id !== newMessage.sender_id) return false;
                            if (msg.conversation_id !== newMessage.conversation_id) return false;

                            // For text messages, match by content
                            if (newMessage.message_type !== 'voice') {
                                if (msg.content !== newMessage.content) return false;
                            }

                            // For voice messages, match by type and approximate duration
                            if (newMessage.message_type === 'voice') {
                                if (msg.message_type !== 'voice') return false;
                            }

                            // Check timestamp proximity (within 10 seconds)
                            const timeDiff = Math.abs(
                                new Date(msg.created_at).getTime() -
                                new Date(newMessage.created_at).getTime()
                            );
                            return timeDiff < 10000;
                        });

                        if (tempMessageIndex !== -1) {
                            const updated = [...prev];
                            updated[tempMessageIndex] = { ...newMessage, _status: 'sent' as const };
                            return updated;
                        }

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
            channel.unsubscribe();
        };
    }, [conversationId, user, markMessagesAsRead]);

    return {
        messages,
        isLoading,
        isSending,
        sendMessage,
        sendAudioMessage,
        retryMessage,
        deleteFailedMessage,
        fetchMessages,
        markMessagesAsRead
    };
}