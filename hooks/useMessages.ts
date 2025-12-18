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

            // Get signed URL for the uploaded audio (private bucket)
            // Using 1 year expiry for voice messages
            // Add retry logic with delay to handle R2 eventual consistency
            let audioUrl: string | null = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                // Small delay to allow R2 to propagate the upload
                if (attempt > 1) {
                    await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                }

                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                    .from('voice-messages')
                    .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365); // 1 year

                if (!signedUrlError && signedUrlData) {
                    audioUrl = signedUrlData.signedUrl;
                    break;
                }

                if (attempt === 3) {
                    throw signedUrlError;
                }
            }

            if (!audioUrl) {
                throw new Error('Failed to generate signed URL');
            }

            // Insert message record
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
                throw error;
            }

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

        console.log('[useMessages] Setting up real-time subscription for:', conversationId);

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
                    console.log('[useMessages] Received new message:', payload);
                    const newMessage = payload.new as Message;

                    // Only add if not already in state (avoid duplicates from optimistic update)
                    setMessages(prev => {
                        // Check if message already exists by ID
                        const existsById = prev.some(msg => msg.id === newMessage.id);
                        if (existsById) {
                            console.log('[useMessages] Message already exists by ID, skipping');
                            return prev;
                        }

                        // Check if there's a temp message that matches (optimistic update)
                        // This handles the race condition where real-time arrives before insert completes
                        const tempMessageIndex = prev.findIndex(msg =>
                            msg.id.startsWith('temp-') &&
                            msg.sender_id === newMessage.sender_id &&
                            msg.content === newMessage.content &&
                            msg.conversation_id === newMessage.conversation_id
                        );

                        if (tempMessageIndex !== -1) {
                            console.log('[useMessages] Replacing temp message with real message');
                            const updated = [...prev];
                            updated[tempMessageIndex] = newMessage;
                            return updated;
                        }

                        console.log('[useMessages] Adding new message to state');
                        return [...prev, newMessage];
                    });

                    // Mark as read if not from current user
                    if (newMessage.sender_id !== user.id) {
                        markMessagesAsRead();
                    }
                }
            )
            .on('system', {}, (payload) => {
                console.log('[useMessages] System event:', JSON.stringify(payload));
            })
            .subscribe((status, err) => {
                console.log('[useMessages] Subscription status:', status);
                if (err) {
                    console.error('[useMessages] Subscription error:', JSON.stringify(err, null, 2));
                }
                // Log the channel state for debugging
                console.log('[useMessages] Channel state:', channel.state);
            });

        return () => {
            console.log('[useMessages] Cleaning up subscription for:', conversationId);
            channel.unsubscribe();
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