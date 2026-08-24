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
      activities: {
        Row: {
          category: string | null
          created_at: string
          file_url: string
          id: string
          image_url: string | null
          kind: Database["public"]["Enums"]["activity_kind"]
          old_import_id: number | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_url: string
          id?: string
          image_url?: string | null
          kind: Database["public"]["Enums"]["activity_kind"]
          old_import_id?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          file_url?: string
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["activity_kind"]
          old_import_id?: number | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: number
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: number
          payload?: Json | null
        }
        Relationships: []
      }
      characters: {
        Row: {
          accent_color: string
          best_friend: string | null
          bg_color: string
          description: string | null
          favorite_juice: string | null
          id: number
          image_url: string | null
          name: string
          power: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          best_friend?: string | null
          bg_color?: string
          description?: string | null
          favorite_juice?: string | null
          id?: number
          image_url?: string | null
          name: string
          power?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          best_friend?: string | null
          bg_color?: string
          description?: string | null
          favorite_juice?: string | null
          id?: number
          image_url?: string | null
          name?: string
          power?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          last_seen_at: string
          platform: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_seen_at?: string
          platform?: string | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_seen_at?: string
          platform?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          checked_in_at: string | null
          created_at: string
          event_id: string
          id: string
          kid_id: string | null
          parent_id: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          kid_id?: string | null
          parent_id: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          kid_id?: string | null
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accent_color: string
          allow_registration: boolean
          bg_color: string
          capacity: number | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          highlights: Json
          id: string
          image_url: string | null
          location: string | null
          notified_at: string | null
          notify_max_age: number | null
          notify_min_age: number | null
          notify_on: string | null
          old_import_id: number | null
          rsvp_points: number
          show_call_button: boolean
          show_on_home: boolean
          sort_order: number
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          time_label: string | null
          title: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          accent_color?: string
          allow_registration?: boolean
          bg_color?: string
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          date: string
          description?: string
          highlights?: Json
          id?: string
          image_url?: string | null
          location?: string | null
          notified_at?: string | null
          notify_max_age?: number | null
          notify_min_age?: number | null
          notify_on?: string | null
          old_import_id?: number | null
          rsvp_points?: number
          show_call_button?: boolean
          show_on_home?: boolean
          sort_order?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          time_label?: string | null
          title: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          accent_color?: string
          allow_registration?: boolean
          bg_color?: string
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          highlights?: Json
          id?: string
          image_url?: string | null
          location?: string | null
          notified_at?: string | null
          notify_max_age?: number | null
          notify_min_age?: number | null
          notify_on?: string | null
          old_import_id?: number | null
          rsvp_points?: number
          show_call_button?: boolean
          show_on_home?: boolean
          sort_order?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          time_label?: string | null
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          created_at: string
          game: string
          id: number
          kid_id: string | null
          points: number
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game?: string
          id?: number
          kid_id?: string | null
          points?: number
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          game?: string
          id?: number
          kid_id?: string | null
          points?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          bg_color: string
          category: Database["public"]["Enums"]["gift_category"]
          color: string
          cost: number
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          image_url: string | null
          name: string
          requires_approval: boolean
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          stock: number | null
          updated_at: string
        }
        Insert: {
          bg_color?: string
          category?: Database["public"]["Enums"]["gift_category"]
          color?: string
          cost: number
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          name: string
          requires_approval?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          stock?: number | null
          updated_at?: string
        }
        Update: {
          bg_color?: string
          category?: Database["public"]["Enums"]["gift_category"]
          color?: string
          cost?: number
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          image_url?: string | null
          name?: string
          requires_approval?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      home_sliders: {
        Row: {
          accent_color: string
          bg_color: string
          ends_at: string | null
          id: string
          image_url: string | null
          link_target: string | null
          link_type: string | null
          sort_order: number
          starts_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          bg_color?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          link_target?: string | null
          link_type?: string | null
          sort_order?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          bg_color?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          link_target?: string | null
          link_type?: string | null
          sort_order?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kids: {
        Row: {
          approved_at: string | null
          avatar_url: string | null
          created_at: string
          dob: string
          expired_at: string | null
          favorite_character_id: number | null
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          last_name: string | null
          member_id: string | null
          old_import_id: number | null
          parent_id: string
          reject_reason: string | null
          status: Database["public"]["Enums"]["kid_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          avatar_url?: string | null
          created_at?: string
          dob: string
          expired_at?: string | null
          favorite_character_id?: number | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          last_name?: string | null
          member_id?: string | null
          old_import_id?: number | null
          parent_id: string
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["kid_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          avatar_url?: string | null
          created_at?: string
          dob?: string
          expired_at?: string | null
          favorite_character_id?: number | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          last_name?: string | null
          member_id?: string | null
          old_import_id?: number | null
          parent_id?: string
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["kid_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kids_fav_character_fk"
            columns: ["favorite_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kids_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          id: string
          kid_id: string | null
          link_target: string | null
          link_type: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          id?: string
          kid_id?: string | null
          link_target?: string | null
          link_type?: string | null
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          id?: string
          kid_id?: string | null
          link_target?: string | null
          link_type?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "push_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          body_md: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          expires_at: string | null
          expiry_processed_at: string | null
          id: number
          kid_id: string | null
          label: string
          reason: Database["public"]["Enums"]["points_reason"]
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          expiry_processed_at?: string | null
          id?: number
          kid_id?: string | null
          label: string
          reason: Database["public"]["Enums"]["points_reason"]
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          expiry_processed_at?: string | null
          id?: number
          kid_id?: string | null
          label?: string
          reason?: Database["public"]["Enums"]["points_reason"]
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accent_color: string
          bg_color: string
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          description: string | null
          highlights: string[]
          id: string
          image_url: string | null
          ingredients: string[]
          name: string
          nutrition: Json
          old_import_id: number | null
          serving_size: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          tagline: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          bg_color?: string
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          highlights?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          name: string
          nutrition?: Json
          old_import_id?: number | null
          serving_size?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          bg_color?: string
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          description?: string | null
          highlights?: string[]
          id?: string
          image_url?: string | null
          ingredients?: string[]
          name?: string
          nutrition?: Json
          old_import_id?: number | null
          serving_size?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          district: string | null
          dob: string | null
          email: string | null
          firstname: string | null
          id: string
          is_active: boolean
          language: string
          last_seen_at: string | null
          lastname: string | null
          legacy_id: number | null
          mobile: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          district?: string | null
          dob?: string | null
          email?: string | null
          firstname?: string | null
          id: string
          is_active?: boolean
          language?: string
          last_seen_at?: string | null
          lastname?: string | null
          legacy_id?: number | null
          mobile?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          district?: string | null
          dob?: string | null
          email?: string | null
          firstname?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_seen_at?: string | null
          lastname?: string | null
          legacy_id?: number | null
          mobile?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_campaigns: {
        Row: {
          audience: Json
          body: string
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          link_target: string | null
          link_type: string | null
          scheduled_at: string | null
          sent_at: string | null
          source: string
          stats: Json
          status: Database["public"]["Enums"]["campaign_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          audience?: Json
          body: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          link_target?: string | null
          link_type?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          source?: string
          stats?: Json
          status?: Database["public"]["Enums"]["campaign_status"]
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          audience?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          link_target?: string | null
          link_type?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          source?: string
          stats?: Json
          status?: Database["public"]["Enums"]["campaign_status"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          batch: string
          code: string
          created_at: string
          expires_at: string | null
          max_uses: number
          points: number
          product_id: string | null
          uses: number
        }
        Insert: {
          batch: string
          code: string
          created_at?: string
          expires_at?: string | null
          max_uses?: number
          points?: number
          product_id?: string | null
          uses?: number
        }
        Update: {
          batch?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          max_uses?: number
          points?: number
          product_id?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          code: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "qr_scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          cost: number
          created_at: string
          gift_id: string
          handled_at: string | null
          handled_by: string | null
          id: string
          kid_id: string | null
          ledger_id: number | null
          note: string | null
          status: Database["public"]["Enums"]["redemption_status"]
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          gift_id: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kid_id?: string | null
          ledger_id?: number | null
          note?: string | null
          status?: Database["public"]["Enums"]["redemption_status"]
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          gift_id?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kid_id?: string | null
          ledger_id?: number | null
          note?: string | null
          status?: Database["public"]["Enums"]["redemption_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "points_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_rules: {
        Row: {
          config: Json
          daily_cap: number | null
          is_active: boolean
          key: Database["public"]["Enums"]["points_reason"]
          label: string
          points: number
          updated_at: string
        }
        Insert: {
          config?: Json
          daily_cap?: number | null
          is_active?: boolean
          key: Database["public"]["Enums"]["points_reason"]
          label: string
          points: number
          updated_at?: string
        }
        Update: {
          config?: Json
          daily_cap?: number | null
          is_active?: boolean
          key?: Database["public"]["Enums"]["points_reason"]
          label?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["staff_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          id: number
          name: string
          old_import_id: number | null
          sort_order: number
        }
        Insert: {
          id?: number
          name: string
          old_import_id?: number | null
          sort_order?: number
        }
        Update: {
          id?: number
          name?: string
          old_import_id?: number | null
          sort_order?: number
        }
        Relationships: []
      }
      store_discounts: {
        Row: {
          description: string
          id: string
          sort_order: number
          store_id: string
          value: number
        }
        Insert: {
          description?: string
          id?: string
          sort_order?: number
          store_id: string
          value: number
        }
        Update: {
          description?: string
          id?: string
          sort_order?: number
          store_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_discounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          category_id: number | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          old_import_id: number | null
          phone: string | null
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category_id?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          old_import_id?: number | null
          phone?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category_id?: number | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          old_import_id?: number | null
          phone?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      points_balances: {
        Row: {
          balance: number | null
          lifetime_earned: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      earn_points: {
        Args: {
          p_amount?: number
          p_kid?: string
          p_label: string
          p_reason: Database["public"]["Enums"]["points_reason"]
          p_ref?: string
        }
        Returns: number
      }
      enqueue_birthday_pushes: { Args: never; Returns: number }
      enqueue_event_pushes: { Args: never; Returns: number }
      expire_kids: { Args: never; Returns: number }
      expire_points: { Args: never; Returns: number }
      invoke_send_push: { Args: never; Returns: undefined }
      is_staff: {
        Args: { min_role?: Database["public"]["Enums"]["staff_role"] }
        Returns: boolean
      }
      points_balance: { Args: { p_user: string }; Returns: number }
      redeem_gift: { Args: { p_gift: string; p_kid?: string }; Returns: string }
      register_for_event: {
        Args: { p_event: string; p_kid?: string }
        Returns: number
      }
      reject_redemption: {
        Args: { p_note: string; p_redemption: string; p_staff: string }
        Returns: boolean
      }
      scan_qr: { Args: { p_code: string }; Returns: number }
    }
    Enums: {
      activity_kind: "puzzle" | "download"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "failed"
        | "cancelled"
      content_status: "draft" | "published" | "archived"
      event_type: "event" | "seminar" | "announcement"
      gender: "boy" | "girl" | "other"
      gift_category: "digital" | "physical"
      kid_status: "pending" | "approved" | "rejected" | "expired"
      notification_type: "event" | "reward" | "gift" | "system" | "birthday"
      points_reason:
        | "daily_login"
        | "streak_bonus"
        | "game"
        | "event_rsvp"
        | "profile_complete"
        | "qr_scan"
        | "gift_redeem"
        | "refund"
        | "manual"
        | "birthday"
        | "expiry"
      product_category: "juice" | "yogurt"
      redemption_status:
        | "requested"
        | "approved"
        | "shipped"
        | "delivered"
        | "rejected"
        | "cancelled"
      staff_role: "admin" | "editor" | "viewer"
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
    Enums: {
      activity_kind: ["puzzle", "download"],
      campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "failed",
        "cancelled",
      ],
      content_status: ["draft", "published", "archived"],
      event_type: ["event", "seminar", "announcement"],
      gender: ["boy", "girl", "other"],
      gift_category: ["digital", "physical"],
      kid_status: ["pending", "approved", "rejected", "expired"],
      notification_type: ["event", "reward", "gift", "system", "birthday"],
      points_reason: [
        "daily_login",
        "streak_bonus",
        "game",
        "event_rsvp",
        "profile_complete",
        "qr_scan",
        "gift_redeem",
        "refund",
        "manual",
        "birthday",
        "expiry",
      ],
      product_category: ["juice", "yogurt"],
      redemption_status: [
        "requested",
        "approved",
        "shipped",
        "delivered",
        "rejected",
        "cancelled",
      ],
      staff_role: ["admin", "editor", "viewer"],
    },
  },
} as const
