export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          additional_travelers: Json | null
          amount_paid: number | null
          balance_amount: number | null
          balance_attempts: number
          balance_charged_at: string | null
          balance_due_date: string | null
          balance_last_error: string | null
          balance_next_attempt_at: string | null
          balance_status: string | null
          booking_ref: string | null
          booking_type: string | null
          created_at: string
          departure_id: string | null
          discount_amount: number | null
          discount_code_id: string | null
          final_price: number | null
          friend_names_mentioned: string | null
          group_id: string | null
          group_members: string[] | null
          group_size: number
          id: string
          lead_age: number | null
          lead_country: string | null
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          lead_solo: boolean | null
          lead_source: string | null
          original_price: number | null
          payment_type: string | null
          reminder_7d_sent_at: string | null
          spot_number: number
          status: string
          stripe_balance_payment_intent_id: string | null
          stripe_balance_refund_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string
          trip_confirmed_notified_at: string | null
          trip_id: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          additional_travelers?: Json | null
          amount_paid?: number | null
          balance_amount?: number | null
          balance_attempts?: number
          balance_charged_at?: string | null
          balance_due_date?: string | null
          balance_last_error?: string | null
          balance_next_attempt_at?: string | null
          balance_status?: string | null
          booking_ref?: string | null
          booking_type?: string | null
          created_at?: string
          departure_id?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          final_price?: number | null
          friend_names_mentioned?: string | null
          group_id?: string | null
          group_members?: string[] | null
          group_size?: number
          id?: string
          lead_age?: number | null
          lead_country?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_solo?: boolean | null
          lead_source?: string | null
          original_price?: number | null
          payment_type?: string | null
          reminder_7d_sent_at?: string | null
          spot_number?: number
          status?: string
          stripe_balance_payment_intent_id?: string | null
          stripe_balance_refund_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id: string
          trip_confirmed_notified_at?: string | null
          trip_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          additional_travelers?: Json | null
          amount_paid?: number | null
          balance_amount?: number | null
          balance_attempts?: number
          balance_charged_at?: string | null
          balance_due_date?: string | null
          balance_last_error?: string | null
          balance_next_attempt_at?: string | null
          balance_status?: string | null
          booking_ref?: string | null
          booking_type?: string | null
          created_at?: string
          departure_id?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          final_price?: number | null
          friend_names_mentioned?: string | null
          group_id?: string | null
          group_members?: string[] | null
          group_size?: number
          id?: string
          lead_age?: number | null
          lead_country?: string | null
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_solo?: boolean | null
          lead_source?: string | null
          original_price?: number | null
          payment_type?: string | null
          reminder_7d_sent_at?: string | null
          spot_number?: number
          status?: string
          stripe_balance_payment_intent_id?: string | null
          stripe_balance_refund_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string
          trip_confirmed_notified_at?: string | null
          trip_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      departure_events: {
        Row: {
          created_at: string
          departure_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          departure_id: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          departure_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departure_events_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "departures"
            referencedColumns: ["id"]
          },
        ]
      }
      departures: {
        Row: {
          bookable: boolean
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          departure_code: string | null
          departure_date: string
          id: string
          min_bookings_to_confirm: number
          spots_remaining: number
          status: string
          total_spots: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          bookable?: boolean
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          departure_code?: string | null
          departure_date: string
          id?: string
          min_bookings_to_confirm?: number
          spots_remaining?: number
          status?: string
          total_spots?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          bookable?: boolean
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          departure_code?: string | null
          departure_date?: string
          id?: string
          min_bookings_to_confirm?: number
          spots_remaining?: number
          status?: string
          total_spots?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departures_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          active: boolean
          applicable_to: string[]
          code: string
          created_at: string
          discount_amount: number
          expiry_date: string | null
          id: string
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          applicable_to?: string[]
          code: string
          created_at?: string
          discount_amount?: number
          expiry_date?: string | null
          id?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          applicable_to?: string[]
          code?: string
          created_at?: string
          discount_amount?: number
          expiry_date?: string | null
          id?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          cc: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          provider_message_id: string | null
          recipient_email: string
          status: string
          subject: string | null
          template_name: string
        }
        Insert: {
          cc?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email: string
          status?: string
          subject?: string | null
          template_name?: string
        }
        Update: {
          cc?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider_message_id?: string | null
          recipient_email?: string
          status?: string
          subject?: string | null
          template_name?: string
        }
        Relationships: []
      }
      pricing_calendar: {
        Row: {
          active: boolean
          created_at: string
          id: string
          month: string
          price: number
          strikethrough: number | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          month: string
          price: number
          strikethrough?: number | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          month?: string
          price?: number
          strikethrough?: number | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_calendar_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_bookings: {
        Row: {
          booker_email: string | null
          booker_name: string | null
          created_at: string
          departure_date: string | null
          id: string
          squad_leader_id: string
          stripe_session_id: string
          trip_slug: string | null
        }
        Insert: {
          booker_email?: string | null
          booker_name?: string | null
          created_at?: string
          departure_date?: string | null
          id?: string
          squad_leader_id: string
          stripe_session_id: string
          trip_slug?: string | null
        }
        Update: {
          booker_email?: string | null
          booker_name?: string | null
          created_at?: string
          departure_date?: string | null
          id?: string
          squad_leader_id?: string
          stripe_session_id?: string
          trip_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_bookings_squad_leader_id_fkey"
            columns: ["squad_leader_id"]
            isOneToOne: false
            referencedRelation: "squad_leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_leaders: {
        Row: {
          access_token: string
          code: string
          created_at: string
          email: string
          id: string
          instagram: string | null
          is_student: boolean
          name: string
          password_hash: string | null
          phone: string
          preferred_month: string | null
          preferred_trip_slug: string | null
          reason: string | null
          reset_token: string | null
          reset_token_expires_at: string | null
          society: string | null
          status: string
          university: string | null
        }
        Insert: {
          access_token?: string
          code: string
          created_at?: string
          email: string
          id?: string
          instagram?: string | null
          is_student?: boolean
          name: string
          password_hash?: string | null
          phone: string
          preferred_month?: string | null
          preferred_trip_slug?: string | null
          reason?: string | null
          reset_token?: string | null
          reset_token_expires_at?: string | null
          society?: string | null
          status?: string
          university?: string | null
        }
        Update: {
          access_token?: string
          code?: string
          created_at?: string
          email?: string
          id?: string
          instagram?: string | null
          is_student?: boolean
          name?: string
          password_hash?: string | null
          phone?: string
          preferred_month?: string | null
          preferred_trip_slug?: string | null
          reason?: string | null
          reset_token?: string | null
          reset_token_expires_at?: string | null
          society?: string | null
          status?: string
          university?: string | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          active: boolean
          activity_count: number | null
          code: string
          created_at: string
          days: number | null
          default_price: number
          default_strikethrough: number | null
          hero_video_url: string | null
          id: string
          name: string
          slug: string
          stops: Json
          testimonials: Json
          updated_at: string
          video_testimonial_url: string | null
        }
        Insert: {
          active?: boolean
          activity_count?: number | null
          code: string
          created_at?: string
          days?: number | null
          default_price?: number
          default_strikethrough?: number | null
          hero_video_url?: string | null
          id?: string
          name: string
          slug: string
          stops?: Json
          testimonials?: Json
          updated_at?: string
          video_testimonial_url?: string | null
        }
        Update: {
          active?: boolean
          activity_count?: number | null
          code?: string
          created_at?: string
          days?: number | null
          default_price?: number
          default_strikethrough?: number | null
          hero_video_url?: string | null
          id?: string
          name?: string
          slug?: string
          stops?: Json
          testimonials?: Json
          updated_at?: string
          video_testimonial_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cron_secret: { Args: never; Returns: string }
      normalize_cron_secret: { Args: { _value: string }; Returns: string }
      recompute_departure_spots: {
        Args: { _departure_id: string }
        Returns: undefined
      }
      recompute_departure_status: {
        Args: { _departure_id: string }
        Returns: undefined
      }
      recompute_discount_used: {
        Args: { _discount_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
