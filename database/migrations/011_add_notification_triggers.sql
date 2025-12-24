-- Migration: Add notification triggers
-- Description: Creates database triggers that automatically create notification records when events occur
-- Dependencies: 009_add_push_notifications.sql (notifications table & create_notification function)

-- =============================================================================
-- Trigger 1: Create notification when new message is sent
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    conv_record RECORD;
    sender_profile RECORD;
    recipient_id UUID;
    msg_preview TEXT;
BEGIN
    -- Get conversation details
    SELECT c.*, l.title as listing_title, l.images as listing_images
    INTO conv_record
    FROM public.conversations c
    JOIN public.listings l ON l.id = c.listing_id
    WHERE c.id = NEW.conversation_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Get sender profile
    SELECT name, avatar_url INTO sender_profile
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Determine recipient
    IF NEW.sender_id = conv_record.buyer_id THEN
        recipient_id := conv_record.seller_id;
    ELSE
        recipient_id := conv_record.buyer_id;
    END IF;

    -- Create message preview
    IF NEW.message_type = 'voice' THEN
        msg_preview := 'Voice message';
    ELSE
        msg_preview := LEFT(NEW.content, 100);
        IF LENGTH(NEW.content) > 100 THEN
            msg_preview := msg_preview || '...';
        END IF;
    END IF;

    -- Create notification (function checks user preferences)
    PERFORM public.create_notification(
        recipient_id,
        'new_message',
        COALESCE(sender_profile.name, 'Someone'),
        msg_preview,
        jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'listing_id', conv_record.listing_id,
            'sender_id', NEW.sender_id,
            'message_id', NEW.id,
            'listing_title', conv_record.listing_title
        ),
        CASE
            WHEN conv_record.listing_images IS NOT NULL
                 AND jsonb_array_length(conv_record.listing_images) > 0
            THEN conv_record.listing_images->>0
            ELSE NULL
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;

-- Create trigger
CREATE TRIGGER on_new_message_notify
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_notify_new_message();

COMMENT ON FUNCTION public.trigger_notify_new_message IS 'Creates notification for message recipient when new message is sent';


-- =============================================================================
-- Trigger 2: Notify seller when buyer starts new conversation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_notify_new_inquiry()
RETURNS TRIGGER AS $$
DECLARE
    listing_record RECORD;
    buyer_profile RECORD;
BEGIN
    -- Get listing details
    SELECT title, images INTO listing_record
    FROM public.listings
    WHERE id = NEW.listing_id;

    -- Get buyer profile
    SELECT name INTO buyer_profile
    FROM public.profiles
    WHERE id = NEW.buyer_id;

    -- Notify the seller
    PERFORM public.create_notification(
        NEW.seller_id,
        'new_inquiry',
        'New inquiry on your listing',
        COALESCE(buyer_profile.name, 'Someone') || ' is interested in ' || COALESCE(listing_record.title, 'your listing'),
        jsonb_build_object(
            'conversation_id', NEW.id,
            'listing_id', NEW.listing_id,
            'buyer_id', NEW.buyer_id,
            'listing_title', listing_record.title
        ),
        CASE
            WHEN listing_record.images IS NOT NULL
                 AND jsonb_array_length(listing_record.images) > 0
            THEN listing_record.images->>0
            ELSE NULL
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_conversation_notify ON public.conversations;

CREATE TRIGGER on_new_conversation_notify
    AFTER INSERT ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_notify_new_inquiry();

COMMENT ON FUNCTION public.trigger_notify_new_inquiry IS 'Creates notification for seller when buyer starts a new conversation';


-- =============================================================================
-- Trigger 3: Notify listing owner when someone favorites their listing
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_notify_listing_favorited()
RETURNS TRIGGER AS $$
DECLARE
    listing_record RECORD;
    user_profile RECORD;
BEGIN
    -- Get listing with owner
    SELECT l.title, l.user_id, l.images
    INTO listing_record
    FROM public.listings l
    WHERE l.id = NEW.listing_id;

    -- Don't notify if user favorites their own listing
    IF listing_record.user_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    -- Get the user who favorited
    SELECT name INTO user_profile
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Notify listing owner
    PERFORM public.create_notification(
        listing_record.user_id,
        'listing_favorited',
        'Someone saved your listing',
        COALESCE(listing_record.title, 'Your listing') || ' was just favorited',
        jsonb_build_object(
            'listing_id', NEW.listing_id,
            'favorited_by', NEW.user_id,
            'listing_title', listing_record.title
        ),
        CASE
            WHEN listing_record.images IS NOT NULL
                 AND jsonb_array_length(listing_record.images) > 0
            THEN listing_record.images->>0
            ELSE NULL
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_listing_favorited_notify ON public.favorites;

CREATE TRIGGER on_listing_favorited_notify
    AFTER INSERT ON public.favorites
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_notify_listing_favorited();

COMMENT ON FUNCTION public.trigger_notify_listing_favorited IS 'Creates notification for listing owner when their listing is favorited';


-- =============================================================================
-- Trigger 4: Notify users who favorited a listing when price drops
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_notify_price_drop()
RETURNS TRIGGER AS $$
DECLARE
    favorite_record RECORD;
    price_diff NUMERIC;
    percentage_drop INTEGER;
BEGIN
    -- Only proceed if price actually decreased
    IF NEW.price >= OLD.price THEN
        RETURN NEW;
    END IF;

    -- Calculate price drop
    price_diff := OLD.price - NEW.price;
    percentage_drop := ROUND(((OLD.price - NEW.price) / OLD.price) * 100);

    -- Notify all users who favorited this listing
    FOR favorite_record IN
        SELECT f.user_id
        FROM public.favorites f
        WHERE f.listing_id = NEW.id
        AND f.user_id != NEW.user_id  -- Don't notify the seller
    LOOP
        PERFORM public.create_notification(
            favorite_record.user_id,
            'price_drop',
            'Price Drop!',
            NEW.title || ' is now $' || NEW.price || ' (was $' || OLD.price || ')',
            jsonb_build_object(
                'listing_id', NEW.id,
                'old_price', OLD.price,
                'new_price', NEW.price,
                'price_diff', price_diff,
                'percentage_drop', percentage_drop,
                'listing_title', NEW.title
            ),
            CASE
                WHEN NEW.images IS NOT NULL
                     AND jsonb_array_length(NEW.images) > 0
                THEN NEW.images->>0
                ELSE NULL
            END
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_price_drop_notify ON public.listings;

CREATE TRIGGER on_price_drop_notify
    AFTER UPDATE OF price ON public.listings
    FOR EACH ROW
    WHEN (NEW.price < OLD.price AND NEW.status = 'active')
    EXECUTE FUNCTION public.trigger_notify_price_drop();

COMMENT ON FUNCTION public.trigger_notify_price_drop IS 'Creates notifications for users who favorited a listing when its price drops';


-- =============================================================================
-- Trigger 5: Notify users who favorited when listing is marked sold
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_notify_listing_sold()
RETURNS TRIGGER AS $$
DECLARE
    favorite_record RECORD;
BEGIN
    -- Only proceed if status changed to 'sold'
    IF NEW.status != 'sold' OR OLD.status = 'sold' THEN
        RETURN NEW;
    END IF;

    -- Notify all users who favorited this listing
    FOR favorite_record IN
        SELECT f.user_id
        FROM public.favorites f
        WHERE f.listing_id = NEW.id
        AND f.user_id != NEW.user_id
    LOOP
        PERFORM public.create_notification(
            favorite_record.user_id,
            'listing_sold',
            'Item no longer available',
            NEW.title || ' has been sold',
            jsonb_build_object(
                'listing_id', NEW.id,
                'listing_title', NEW.title
            ),
            CASE
                WHEN NEW.images IS NOT NULL
                     AND jsonb_array_length(NEW.images) > 0
                THEN NEW.images->>0
                ELSE NULL
            END
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_listing_sold_notify ON public.listings;

CREATE TRIGGER on_listing_sold_notify
    AFTER UPDATE OF status ON public.listings
    FOR EACH ROW
    WHEN (NEW.status = 'sold' AND OLD.status != 'sold')
    EXECUTE FUNCTION public.trigger_notify_listing_sold();

COMMENT ON FUNCTION public.trigger_notify_listing_sold IS 'Creates notifications for users who favorited a listing when it is sold';


-- =============================================================================
-- Verification Query (run after migration to confirm triggers exist)
-- =============================================================================
-- SELECT
--     trigger_name,
--     event_manipulation,
--     event_object_table,
--     action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
-- AND trigger_name LIKE '%notify%'
-- ORDER BY event_object_table, trigger_name;
