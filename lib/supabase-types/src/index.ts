// Supabase-generated types for the shared WODPLACE project (wiwpaekdykxernegicdv).
// Single source of truth consumed by artifacts/box-admin and artifacts/super-admin
// (each app's src/integrations/supabase/types.ts just re-exports from here).
//
// Regenerate (public schema, no auth needed) with:
//   npx supabase gen types typescript --project-id wiwpaekdykxernegicdv > lib/supabase-types/src/index.ts
// then re-add this header. Do not hand-edit the type bodies.

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
      admin_invites: {
        Row: {
          box_id: string
          code: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string | null
          id: string
          role: string
          status: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          box_id: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string | null
          id?: string
          role?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          box_id?: string
          code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          role?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invites_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_pins: {
        Row: {
          created_at: string
          failed_attempts: number
          locked_until: string | null
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          box_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          box_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          box_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          banner_days: number
          body: string
          box_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          send_push: boolean
          show_banner: boolean
          title: string
        }
        Insert: {
          banner_days?: number
          body: string
          box_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          send_push?: boolean
          show_banner?: boolean
          title: string
        }
        Update: {
          banner_days?: number
          body?: string
          box_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          send_push?: boolean
          show_banner?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attended_at: string
          box_id: string
          class_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          attended_at?: string
          box_id: string
          class_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          attended_at?: string
          box_id?: string
          class_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_at: string
          box_id: string
          user_id: string
        }
        Insert: {
          blocked_at?: string
          box_id: string
          user_id: string
        }
        Update: {
          blocked_at?: string
          box_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_user_id_wodplace_users_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      box_members: {
        Row: {
          box_id: string
          created_at: string
          joined_at: string
          next_payment_at: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          box_id: string
          created_at?: string
          joined_at?: string
          next_payment_at?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          box_id?: string
          created_at?: string
          joined_at?: string
          next_payment_at?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_members_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "box_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      box_settings: {
        Row: {
          box_id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          box_id: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          box_id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_settings_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      boxes: {
        Row: {
          created_at: string
          id: string
          location: string | null
          name: string
          owner_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          name: string
          owner_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          owner_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_bookings: {
        Row: {
          box_id: string
          created_at: string
          id: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          box_id: string
          created_at?: string
          id?: string
          session_id: string
          status: string
          user_id: string
        }
        Update: {
          box_id?: string
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_user_id_wodplace_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          box_id: string
          capacity: number
          class_id: string | null
          coach_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          level: string
          name: string
          session_date: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          box_id: string
          capacity?: number
          class_id?: string | null
          coach_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          level?: string
          name: string
          session_date: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          box_id?: string
          capacity?: number
          class_id?: string | null
          coach_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          level?: string
          name?: string
          session_date?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          box_id: string
          capacity: number
          coach_id: string | null
          created_at: string
          day_of_week: number | null
          id: string
          name: string
          start_time: string | null
        }
        Insert: {
          box_id: string
          capacity?: number
          coach_id?: string | null
          created_at?: string
          day_of_week?: number | null
          id?: string
          name: string
          start_time?: string | null
        }
        Update: {
          box_id?: string
          capacity?: number
          coach_id?: string | null
          created_at?: string
          day_of_week?: number | null
          id?: string
          name?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          box_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          permissions: Json
          phone: string | null
          photo_url: string | null
          specialty: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          box_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          permissions?: Json
          phone?: string | null
          photo_url?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          box_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          permissions?: Json
          phone?: string | null
          photo_url?: string | null
          specialty?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_acceptances: {
        Row: {
          accepted_at: string
          box_id: string
          emergency_contact_name: string
          emergency_contact_phone: string
          guardian_name: string | null
          guardian_relationship: string | null
          seen_by_owner_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at: string
          box_id: string
          emergency_contact_name: string
          emergency_contact_phone: string
          guardian_name?: string | null
          guardian_relationship?: string | null
          seen_by_owner_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          box_id?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          guardian_name?: string | null
          guardian_relationship?: string | null
          seen_by_owner_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_acceptances_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_acceptances_user_id_wodplace_users_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          box_id: string
          created_at: string
          doc_type: string
          file_name: string | null
          id: string
          mime_type: string | null
          object_path: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          box_id: string
          created_at?: string
          doc_type?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          object_path?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          box_id?: string
          created_at?: string
          doc_type?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          object_path?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_read_progress: {
        Row: {
          box_id: string
          document_slug: string
          read_at: string
          user_id: string
        }
        Insert: {
          box_id: string
          document_slug: string
          read_at?: string
          user_id: string
        }
        Update: {
          box_id?: string
          document_slug?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_read_progress_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_read_progress_document_slug_contract_documents_slug_fk"
            columns: ["document_slug"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "contract_read_progress_user_id_wodplace_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_requests: {
        Row: {
          box_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          box_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          box_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_requests_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          box_id: string
          created_at: string
          id: string
          method: string | null
          next_payment_at: string | null
          notes: string | null
          paid_at: string | null
          plan_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          box_id: string
          created_at?: string
          id?: string
          method?: string | null
          next_payment_at?: string | null
          notes?: string | null
          paid_at?: string | null
          plan_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          box_id?: string
          created_at?: string
          id?: string
          method?: string | null
          next_payment_at?: string | null
          notes?: string | null
          paid_at?: string | null
          plan_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          benefits: string[]
          billing_period: string | null
          box_id: string
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          benefits?: string[]
          billing_period?: string | null
          box_id: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          benefits?: string[]
          billing_period?: string | null
          box_id?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      prs: {
        Row: {
          achieved_at: string
          box_id: string
          created_at: string
          id: string
          lift_name: string
          notes: string | null
          unit: string
          user_id: string
          weight: number
        }
        Insert: {
          achieved_at?: string
          box_id: string
          created_at?: string
          id?: string
          lift_name: string
          notes?: string | null
          unit?: string
          user_id: string
          weight: number
        }
        Update: {
          achieved_at?: string
          box_id?: string
          created_at?: string
          id?: string
          lift_name?: string
          notes?: string | null
          unit?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "prs_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comments: {
        Row: {
          author_name: string
          body: string
          box_id: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          body: string
          box_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string
          box_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_post_id_social_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_comments_user_id_wodplace_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          author_name: string
          body: string
          box_id: string
          created_at: string
          deleted_at: string | null
          id: string
          image_uris: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          body?: string
          box_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          image_uris?: string | null
          type?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string
          box_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_uris?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_user_id_wodplace_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_reactions: {
        Row: {
          box_id: string
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          box_id: string
          created_at?: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Update: {
          box_id?: string
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_reactions_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_reactions_post_id_social_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_reactions_user_id_wodplace_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_reports: {
        Row: {
          box_id: string
          created_at: string
          id: string
          post_id: string
          reason: string
          reporter_id: string | null
          reporter_name: string
          resolved_at: string | null
        }
        Insert: {
          box_id: string
          created_at?: string
          id: string
          post_id: string
          reason: string
          reporter_id?: string | null
          reporter_name: string
          resolved_at?: string | null
        }
        Update: {
          box_id?: string
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string | null
          reporter_name?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_reports_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_reports_post_id_social_posts_id_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_reports_reporter_id_wodplace_users_id_fk"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          box_id: string | null
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          box_id?: string | null
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          box_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      wodplace_notifications: {
        Row: {
          body: string
          box_id: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          box_id: string
          created_at?: string
          id: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          box_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wodplace_notifications_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wodplace_notifications_user_id_wodplace_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      wodplace_users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_super_admin: { Args: never; Returns: boolean }
      storage_box_prefix: { Args: { _name: string }; Returns: string }
      user_is_box_staff: { Args: { _box_id: string }; Returns: boolean }
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
