export type UserRole = "farmer" | "buyer" | "admin";

export type ListingStatus = "active" | "sold" | "expired" | "hidden";

export type OrderStatus = "pending" | "confirmed" | "in_transit" | "delivered" | "completed" | "disputed" | "rejected" | "cancelled";

export type PaymentMethod = "mtn_momo" | "orange_money" | "mastercard";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole | null;
          phone_e164: string | null;
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          region: string | null;
          commune: string | null;
          address: string | null;
          references_text: string | null;
          verified: boolean;
          suspended: boolean;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole | null;
          phone_e164?: string | null;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          region?: string | null;
          commune?: string | null;
          address?: string | null;
          references_text?: string | null;
          verified?: boolean;
          suspended?: boolean;
          onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole | null;
          phone_e164?: string | null;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          region?: string | null;
          commune?: string | null;
          address?: string | null;
          references_text?: string | null;
          verified?: boolean;
          suspended?: boolean;
          onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          farmer_id: string;
          title: string;
          crop_type: string;
          description: string | null;
          quantity: number;
          unit: string;
          price_xaf: number;
          harvest_date: string | null;
          expiry_date: string | null;
          region: string;
          commune: string;
          location: { lat: number; lng: number } | null;
          image_urls: string[];
          status: ListingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farmer_id: string;
          title: string;
          crop_type: string;
          description?: string | null;
          quantity: number;
          unit: string;
          price_xaf: number;
          harvest_date?: string | null;
          expiry_date?: string | null;
          region: string;
          commune: string;
          location?: { lat: number; lng: number } | null;
          image_urls?: string[];
          status?: ListingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farmer_id?: string;
          title?: string;
          crop_type?: string;
          description?: string | null;
          quantity?: number;
          unit?: string;
          price_xaf?: number;
          harvest_date?: string | null;
          expiry_date?: string | null;
          region?: string;
          commune?: string;
          location?: { lat: number; lng: number } | null;
          image_urls?: string[];
          status?: ListingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          farmer_id: string;
          quantity: number;
          price_xaf: number;
          status: OrderStatus;
          payment_method: PaymentMethod | null;
          payment_status: PaymentStatus;
          payment_provider: string | null;
          payment_reference: string | null;
          payment_external_reference: string | null;
          payment_phone_e164: string | null;
          payment_error: string | null;
          payment_requested_at: string | null;
          payment_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          buyer_id: string;
          farmer_id: string;
          quantity: number;
          price_xaf: number;
          status?: OrderStatus;
          payment_method?: PaymentMethod | null;
          payment_status?: PaymentStatus;
          payment_provider?: string | null;
          payment_reference?: string | null;
          payment_external_reference?: string | null;
          payment_phone_e164?: string | null;
          payment_error?: string | null;
          payment_requested_at?: string | null;
          payment_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          buyer_id?: string;
          farmer_id?: string;
          quantity?: number;
          price_xaf?: number;
          status?: OrderStatus;
          payment_method?: PaymentMethod | null;
          payment_status?: PaymentStatus;
          payment_provider?: string | null;
          payment_reference?: string | null;
          payment_external_reference?: string | null;
          payment_phone_e164?: string | null;
          payment_error?: string | null;
          payment_requested_at?: string | null;
          payment_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_events: {
        Row: {
          id: string;
          order_id: string;
          actor_id: string | null;
          from_status: string | null;
          to_status: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          actor_id?: string | null;
          from_status?: string | null;
          to_status: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          actor_id?: string | null;
          from_status?: string | null;
          to_status?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      market_prices: {
        Row: {
          id: string;
          crop_type: string;
          region: string;
          price_xaf: number;
          captured_at: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          crop_type: string;
          region: string;
          price_xaf: number;
          captured_at: string;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          crop_type?: string;
          region?: string;
          price_xaf?: number;
          captured_at?: string;
          source?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          participant_low: string;
          participant_high: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_low: string;
          participant_high: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_low?: string;
          participant_high?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          recipient_id?: string;
          body?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          listing_id: string;
          order_id: string | null;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          order_id?: string | null;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          order_id?: string | null;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      reviewee_rating_summary: {
        Row: {
          reviewee_id: string;
          avg_rating: number;
          rating_count: number;
        };
        Relationships: [];
      };
      listing_rating_summary: {
        Row: {
          listing_id: string;
          avg_rating: number;
          rating_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      transition_order_status: {
        Args: { p_order_id: string; p_next_status: string; p_note?: string | null };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      admin_get_kpis: {
        Args: { p_from?: string | null; p_to?: string | null };
        Returns: Array<{
          total_users: number;
          onboarded_users: number;
          verified_users: number;
          suspended_users: number;
          total_listings: number;
          active_listings: number;
          hidden_listings: number;
          total_orders: number;
          disputed_orders: number;
          completed_orders: number;
          completed_gmv_xaf: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
