// Chat system types for 3ANTAR marketplace

export interface Conversation {
    id: string;
    listing_id: string;
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
        id: string;
        title: string;
        price: number;
        currency: string;
        images: string[] | null;
        status: string;
    } | null;
    other_user: {
        id: string;
        display_name: string;
        avatar_url: string | null;
    };
    unread_count: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
}

export interface CreateConversationDTO {
    listing_id: string;
    buyer_id: string;
    seller_id: string;
}

export interface CreateMessageDTO {
    conversation_id: string;
    sender_id: string;
    content: string;
}