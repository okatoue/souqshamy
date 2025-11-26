export interface Conversation {
    id: string;
    listing_id: number;
    buyer_id: string;
    seller_id: string;
    last_message: string | null;
    last_message_at: string;
    buyer_unread_count: number;
    seller_unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
    listing: {
        id: number;
        title: string;
        price: number;
        currency: string;
        images: string[] | null;
        status: 'active' | 'sold' | 'inactive';
    };
    other_user: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
    };
    unread_count: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: 'text' | 'voice';
    audio_url: string | null;
    audio_duration: number | null;
    is_read: boolean;
    created_at: string;
}

export interface CreateConversationDTO {
    listing_id: number;
    buyer_id: string;
    seller_id: string;
}

export interface CreateMessageDTO {
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type?: 'text' | 'voice';
    audio_url?: string | null;
    audio_duration?: number | null;
}