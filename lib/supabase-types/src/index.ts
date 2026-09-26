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
      account_recovery_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          locked_until: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          locked_until?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          locked_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_recovery_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      announcement_athlete_reads: {
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
            foreignKeyName: "announcement_athlete_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_athlete_reads_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_athlete_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          author_name: string
          body: string
          box_id: string
          created_at: string
          deleted_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          announcement_id: string
          author_name: string
          body: string
          box_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          user_id?: string | null
        }
        Update: {
          announcement_id?: string
          author_name?: string
          body?: string
          box_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          box_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          box_id: string
          created_at?: string
          emoji: string
          id: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          box_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reactions_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      box_creation_authorizations: {
        Row: {
          authorized_at: string
          authorized_by: string
          email: string
          revoked_at: string | null
          used_at: string | null
        }
        Insert: {
          authorized_at?: string
          authorized_by: string
          email: string
          revoked_at?: string | null
          used_at?: string | null
        }
        Update: {
          authorized_at?: string
          authorized_by?: string
          email?: string
          revoked_at?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      box_members: {
        Row: {
          box_id: string
          created_at: string
          joined_at: string
          member_since: string | null
          new_member_seen_at: string | null
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
          member_since?: string | null
          new_member_seen_at?: string | null
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
          member_since?: string | null
          new_member_seen_at?: string | null
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
          contact_phone: string | null
          created_at: string
          facebook_url: string | null
          id: string
          instagram_url: string | null
          location: string | null
          name: string
          owner_name: string | null
          owner_user_id: string | null
          photo_url: string | null
          status: string
          tiktok_url: string | null
          updated_at: string
          welcome_shown_at: string | null
          whatsapp: string | null
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          location?: string | null
          name: string
          owner_name?: string | null
          owner_user_id?: string | null
          photo_url?: string | null
          status?: string
          tiktok_url?: string | null
          updated_at?: string
          welcome_shown_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          location?: string | null
          name?: string
          owner_name?: string | null
          owner_user_id?: string | null
          photo_url?: string | null
          status?: string
          tiktok_url?: string | null
          updated_at?: string
          welcome_shown_at?: string | null
          whatsapp?: string | null
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
      coach_permission_changes: {
        Row: {
          box_id: string
          changed_by: string
          changed_by_email: string
          changes: Json
          coach_id: string
          created_at: string
          id: string
        }
        Insert: {
          box_id: string
          changed_by: string
          changed_by_email: string
          changes: Json
          coach_id: string
          created_at?: string
          id?: string
        }
        Update: {
          box_id?: string
          changed_by?: string
          changed_by_email?: string
          changes?: Json
          coach_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_permission_changes_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_permission_changes_coach_id_fkey"
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
          minor_data_consent_at: string | null
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
          minor_data_consent_at?: string | null
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
          minor_data_consent_at?: string | null
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
          audience: string
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
          audience?: string
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
          audience?: string
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
      movements: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id: string
          is_default?: boolean
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "movements_created_by_fkey"
            columns: ["created_by"]
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
          classes_per_period: number | null
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
          classes_per_period?: number | null
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
          classes_per_period?: number | null
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
      platform_agreement_acceptances: {
        Row: {
          accepted_at: string
          box_id: string
          user_id: string
        }
        Insert: {
          accepted_at: string
          box_id: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          box_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_agreement_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          id: string
          movement_id: string
          target_unit: string
          target_weight: number
          target_weight_kg: number | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          id: string
          movement_id: string
          target_unit: string
          target_weight: number
          target_weight_kg?: number | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          movement_id?: string
          target_unit?: string
          target_weight?: number
          target_weight_kg?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_goals_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pr_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "wodplace_users"
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
          created_at: string
          id: string
          lift_name: string
          movement_id: string
          notes: string | null
          percentage: number | null
          unit: string
          user_id: string
          weight: number
          weight_kg: number | null
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          id?: string
          lift_name: string
          movement_id: string
          notes?: string | null
          percentage?: number | null
          unit?: string
          user_id: string
          weight: number
          weight_kg?: number | null
        }
        Update: {
          achieved_at?: string
          created_at?: string
          id?: string
          lift_name?: string
          movement_id?: string
          notes?: string | null
          percentage?: number | null
          unit?: string
          user_id?: string
          weight?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prs_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
      super_admin_audit_log: {
        Row: {
          action: string
          actor_email: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_email: string
          created_at?: string
          id: string
          metadata?: Json | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_email?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      support_reports: {
        Row: {
          box_id: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          reporter_email: string
          reporter_user_id: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          box_id: string
          created_at?: string
          description: string
          id: string
          image_url?: string | null
          reporter_email: string
          reporter_user_id: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          box_id?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          reporter_email?: string
          reporter_user_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      training_settings: {
        Row: {
          bar_unit: string
          bar_weight: number
          plates: Json
          preferred_unit: string
          sex: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bar_unit?: string
          bar_weight?: number
          plates?: Json
          preferred_unit?: string
          sex?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bar_unit?: string
          bar_weight?: number
          plates?: Json
          preferred_unit?: string
          sex?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "wodplace_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          awarded_by: string | null
          box_id: string | null
          created_at: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          awarded_by?: string | null
          box_id?: string | null
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          awarded_by?: string | null
          box_id?: string | null
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
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
          avatar_url: string | null
          birthdate: string | null
          created_at: string
          email: string
          id: string
          name: string
          phrase: string | null
          rank: string | null
        }
        Insert: {
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phrase?: string | null
          rank?: string | null
        }
        Update: {
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phrase?: string | null
          rank?: string | null
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
      user_is_any_box_admin: { Args: never; Returns: boolean }
      user_is_box_staff: { Args: { _box_id: string }; Returns: boolean }
      user_is_super_admin: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
