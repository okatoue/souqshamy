import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  image_url?: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
  ttl?: number;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// Map notification types to Android channels
const NOTIFICATION_CHANNELS: Record<string, string> = {
  new_message: "messages",
  new_inquiry: "messages",
  listing_favorited: "listing-activity",
  price_drop: "listing-activity",
  listing_sold: "listing-activity",
  promotion: "promotions",
  system: "default",
};

// Map notification types to priority
const NOTIFICATION_PRIORITY: Record<string, "high" | "normal" | "default"> = {
  new_message: "high",
  new_inquiry: "high",
  listing_favorited: "normal",
  price_drop: "normal",
  listing_sold: "normal",
  promotion: "default",
  system: "high",
};

serve(async (req: Request) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Verify request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get service role key from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { notification_id, batch_mode = false, limit = 100 } = body;

    let notificationsToSend: NotificationRecord[] = [];

    if (notification_id) {
      // Send specific notification
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notification_id)
        .eq("is_pushed", false)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Notification not found or already sent" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      notificationsToSend = [data];
    } else if (batch_mode) {
      // Process pending notifications in batch
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_pushed", false)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      notificationsToSend = data || [];
    } else {
      return new Response(
        JSON.stringify({ error: "Must provide notification_id or batch_mode" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (notificationsToSend.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      debug: [] as string[], // Debug info for troubleshooting
    };

    // Process each notification
    for (const notification of notificationsToSend) {
      try {
        // Get user's push tokens
        const { data: tokens, error: tokenError } = await supabase
          .from("push_tokens")
          .select("expo_push_token, device_type")
          .eq("user_id", notification.user_id)
          .eq("is_active", true);

        if (tokenError || !tokens || tokens.length === 0) {
          // No tokens - mark as pushed but skip
          await supabase
            .from("notifications")
            .update({ is_pushed: true, push_sent_at: new Date().toISOString() })
            .eq("id", notification.id);

          results.skipped++;
          continue;
        }

        // Build Expo push messages
        const messages: ExpoPushMessage[] = tokens.map((token) => ({
          to: token.expo_push_token,
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            type: notification.type,
            notification_id: notification.id,
          },
          sound: "default",
          channelId: NOTIFICATION_CHANNELS[notification.type] || "default",
          priority: NOTIFICATION_PRIORITY[notification.type] || "default",
          ttl: 86400, // 24 hours
        }));

        // Debug: Log the messages being sent
        console.log("[Push] Sending to tokens:", tokens.map(t => t.expo_push_token));
        console.log("[Push] Notification:", notification.id, notification.title);
        console.log("[Push] Messages payload:", JSON.stringify(messages, null, 2));

        // Send to Expo
        const expoPushResponse = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });

        const expoPushResult = await expoPushResponse.json();
        const tickets: ExpoPushTicket[] = expoPushResult.data || [];

        // Debug: Log the full Expo response
        console.log("[Push] Expo API response status:", expoPushResponse.status);
        console.log("[Push] Expo API response:", JSON.stringify(expoPushResult, null, 2));

        // Add debug info to results
        results.debug.push(`Notification ${notification.id}: sent to ${tokens.length} token(s)`);
        results.debug.push(`Tokens: ${tokens.map(t => t.expo_push_token).join(", ")}`);
        results.debug.push(`Expo response: ${JSON.stringify(expoPushResult)}`);

        // Check for errors
        const hasError = tickets.some((ticket) => ticket.status === "error");

        // Handle DeviceNotRegistered errors - deactivate those tokens
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (
            ticket.status === "error" &&
            ticket.details?.error === "DeviceNotRegistered"
          ) {
            // Deactivate this token
            await supabase
              .from("push_tokens")
              .update({ is_active: false })
              .eq("expo_push_token", tokens[i].expo_push_token);

            console.log(
              `Deactivated unregistered token: ${tokens[i].expo_push_token}`
            );
          }
        }

        // Update notification as sent
        await supabase
          .from("notifications")
          .update({
            is_pushed: true,
            push_sent_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        if (hasError) {
          results.failed++;
          results.errors.push(
            `Notification ${notification.id}: Some deliveries failed`
          );
        } else {
          results.sent++;
        }
      } catch (notifError) {
        results.failed++;
        results.errors.push(
          `Notification ${notification.id}: ${(notifError as Error).message}`
        );
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
