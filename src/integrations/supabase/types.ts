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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      advertisers: {
        Row: {
          cnpj: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          metadata: Json | null
          name: string
          slug: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          slug: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          slug?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integrations: {
        Row: {
          auth_body_json: Json
          auth_body_text: string | null
          auth_curl: string | null
          auth_headers_json: Json
          auth_method: string | null
          auth_query_params_json: Json
          auth_token_path: string | null
          auth_type: string
          auth_url: string | null
          barcode_param_name: string | null
          base_url: string
          created_at: string
          default_settings: Json | null
          description: string | null
          endpoints: Json | null
          id: string
          is_active: boolean
          name: string
          request_body_json: Json
          request_body_text: string | null
          request_curl: string | null
          request_headers_json: Json
          request_method: string | null
          request_params_json: Json
          request_query_params_json: Json
          request_url: string | null
          request_variables_json: Json
          response_data_path: string | null
          response_mapping_json: Json
          slug: string
          store_param_name: string | null
          token_cache: Json
          token_expiration_seconds: number | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          auth_body_json?: Json
          auth_body_text?: string | null
          auth_curl?: string | null
          auth_headers_json?: Json
          auth_method?: string | null
          auth_query_params_json?: Json
          auth_token_path?: string | null
          auth_type?: string
          auth_url?: string | null
          barcode_param_name?: string | null
          base_url: string
          created_at?: string
          default_settings?: Json | null
          description?: string | null
          endpoints?: Json | null
          id?: string
          is_active?: boolean
          name: string
          request_body_json?: Json
          request_body_text?: string | null
          request_curl?: string | null
          request_headers_json?: Json
          request_method?: string | null
          request_params_json?: Json
          request_query_params_json?: Json
          request_url?: string | null
          request_variables_json?: Json
          response_data_path?: string | null
          response_mapping_json?: Json
          slug: string
          store_param_name?: string | null
          token_cache?: Json
          token_expiration_seconds?: number | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          auth_body_json?: Json
          auth_body_text?: string | null
          auth_curl?: string | null
          auth_headers_json?: Json
          auth_method?: string | null
          auth_query_params_json?: Json
          auth_token_path?: string | null
          auth_type?: string
          auth_url?: string | null
          barcode_param_name?: string | null
          base_url?: string
          created_at?: string
          default_settings?: Json | null
          description?: string | null
          endpoints?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          request_body_json?: Json
          request_body_text?: string | null
          request_curl?: string | null
          request_headers_json?: Json
          request_method?: string | null
          request_params_json?: Json
          request_query_params_json?: Json
          request_url?: string | null
          request_variables_json?: Json
          response_data_path?: string | null
          response_mapping_json?: Json
          slug?: string
          store_param_name?: string | null
          token_cache?: Json
          token_expiration_seconds?: number | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audience_detections: {
        Row: {
          age: number | null
          created_at: string
          detected_at: string
          device_id: string | null
          emotion: string | null
          emotion_confidence: number | null
          gender: string | null
          gender_probability: number | null
          id: string
          metadata: Json | null
          session_id: string | null
          tenant_id: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          detected_at?: string
          device_id?: string | null
          emotion?: string | null
          emotion_confidence?: number | null
          gender?: string | null
          gender_probability?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string
          detected_at?: string
          device_id?: string | null
          emotion?: string | null
          emotion_confidence?: number | null
          gender?: string | null
          gender_probability?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audience_detections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_correcoes_log: {
        Row: {
          detalhes: string | null
          etapa: string
          executado_em: string | null
          id: string
          registros_afetados: number | null
          status: string
        }
        Insert: {
          detalhes?: string | null
          etapa: string
          executado_em?: string | null
          id?: string
          registros_afetados?: number | null
          status: string
        }
        Update: {
          detalhes?: string | null
          etapa?: string
          executado_em?: string | null
          id?: string
          registros_afetados?: number | null
          status?: string
        }
        Relationships: []
      }
      auto_content_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          payload_json: Json | null
          source: string
          status: string
          tenant_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          payload_json?: Json | null
          source?: string
          status?: string
          tenant_id: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          payload_json?: Json | null
          source?: string
          status?: string
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_content_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_content_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_fetch_at: string | null
          module_type: string
          refresh_interval_minutes: number
          tenant_id: string
          updated_at: string
          weather_city: string | null
          weather_country: string | null
          weather_state: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_fetch_at?: string | null
          module_type: string
          refresh_interval_minutes?: number
          tenant_id: string
          updated_at?: string
          weather_city?: string | null
          weather_country?: string | null
          weather_state?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_fetch_at?: string | null
          module_type?: string
          refresh_interval_minutes?: number
          tenant_id?: string
          updated_at?: string
          weather_city?: string | null
          weather_country?: string | null
          weather_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_content_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_people: {
        Row: {
          birth_date: string
          created_at: string
          department: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          role: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          birth_date: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_people_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_uploads: {
        Row: {
          created_at: string
          file_url: string
          id: string
          processed: boolean
          tenant_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          processed?: boolean
          tenant_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          processed?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contents: {
        Row: {
          campaign_id: string
          created_at: string | null
          duration_override: number | null
          id: string
          is_active: boolean | null
          media_id: string
          position: number | null
          weight: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          duration_override?: number | null
          id?: string
          is_active?: boolean | null
          media_id: string
          position?: number | null
          weight?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          duration_override?: number | null
          id?: string
          is_active?: boolean | null
          media_id?: string
          position?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contents_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_segment_targets: {
        Row: {
          city_id: string | null
          clause_id: string
          company_id: string | null
          created_at: string
          device_group_id: string | null
          device_id: string | null
          device_type_id: string | null
          id: string
          include: boolean
          region_id: string | null
          sector_id: string | null
          segment_id: string
          state_id: string | null
          store_id: string | null
          tag_id: string | null
          target_type: string
          zone_id: string | null
        }
        Insert: {
          city_id?: string | null
          clause_id?: string
          company_id?: string | null
          created_at?: string
          device_group_id?: string | null
          device_id?: string | null
          device_type_id?: string | null
          id?: string
          include?: boolean
          region_id?: string | null
          sector_id?: string | null
          segment_id: string
          state_id?: string | null
          store_id?: string | null
          tag_id?: string | null
          target_type: string
          zone_id?: string | null
        }
        Update: {
          city_id?: string | null
          clause_id?: string
          company_id?: string | null
          created_at?: string
          device_group_id?: string | null
          device_id?: string | null
          device_type_id?: string | null
          id?: string
          include?: boolean
          region_id?: string | null
          sector_id?: string | null
          segment_id?: string
          state_id?: string | null
          store_id?: string | null
          tag_id?: string | null
          target_type?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_segment_targets_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_device_group_id_fkey"
            columns: ["device_group_id"]
            isOneToOne: false
            referencedRelation: "device_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "campaign_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segment_targets_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_segments: {
        Row: {
          created_at: string
          description: string | null
          filters_json: Json
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filters_json?: Json
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filters_json?: Json
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_segments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_targets: {
        Row: {
          campaign_id: string
          city_id: string | null
          clause_id: string | null
          company_id: string | null
          created_at: string | null
          device_group_id: string | null
          device_id: string | null
          device_type_id: string | null
          id: string
          include: boolean | null
          region_id: string | null
          sector_id: string | null
          segment_id: string | null
          state_id: string | null
          store_id: string | null
          tag_id: string | null
          target_type: string
          zone_id: string | null
        }
        Insert: {
          campaign_id: string
          city_id?: string | null
          clause_id?: string | null
          company_id?: string | null
          created_at?: string | null
          device_group_id?: string | null
          device_id?: string | null
          device_type_id?: string | null
          id?: string
          include?: boolean | null
          region_id?: string | null
          sector_id?: string | null
          segment_id?: string | null
          state_id?: string | null
          store_id?: string | null
          tag_id?: string | null
          target_type: string
          zone_id?: string | null
        }
        Update: {
          campaign_id?: string
          city_id?: string | null
          clause_id?: string | null
          company_id?: string | null
          created_at?: string | null
          device_group_id?: string | null
          device_id?: string | null
          device_type_id?: string | null
          id?: string
          include?: boolean | null
          region_id?: string | null
          sector_id?: string | null
          segment_id?: string | null
          state_id?: string | null
          store_id?: string | null
          tag_id?: string | null
          target_type?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_device_group_id_fkey"
            columns: ["device_group_id"]
            isOneToOne: false
            referencedRelation: "device_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "campaign_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          advertiser_id: string | null
          budget: number | null
          campaign_type: string | null
          company_id: string | null
          contract_id: string | null
          created_at: string | null
          current_impressions: number | null
          days_of_week: number[] | null
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          max_impressions: number | null
          metadata: Json | null
          name: string
          priority: number | null
          start_date: string | null
          start_time: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          advertiser_id?: string | null
          budget?: number | null
          campaign_type?: string | null
          company_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          current_impressions?: number | null
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          max_impressions?: number | null
          metadata?: Json | null
          name: string
          priority?: number | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          advertiser_id?: string | null
          budget?: number | null
          campaign_type?: string | null
          company_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          current_impressions?: number | null
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          max_impressions?: number | null
          metadata?: Json | null
          name?: string
          priority?: number | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      canva_auth_states: {
        Row: {
          code_verifier: string
          created_at: string
          expires_at: string
          id: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          expires_at: string
          id?: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          expires_at?: string
          id?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      canva_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          scopes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          scopes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scopes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          created_at: string
          description: string | null
          fallback_playlist_id: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          priority: number
          source: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fallback_playlist_id?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          priority?: number
          source?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fallback_playlist_id?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          priority?: number
          source?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_fallback_playlist_id_fkey"
            columns: ["fallback_playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string | null
          created_at: string | null
          id: string
          name: string
          region_id: string | null
          state_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          region_id?: string | null
          state_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          region_id?: string | null
          state_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          code: string | null
          created_at: string
          default_playlist_id: string | null
          id: string
          is_active: boolean
          name: string
          settings: Json | null
          slug: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          code?: string | null
          created_at?: string
          default_playlist_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          settings?: Json | null
          slug: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          code?: string | null
          created_at?: string
          default_playlist_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json | null
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_default_playlist_id_fkey"
            columns: ["default_playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_integrations: {
        Row: {
          company_id: string
          created_at: string
          credentials: Json | null
          id: string
          integration_id: string
          is_active: boolean
          settings: Json | null
          token_cache: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          credentials?: Json | null
          id?: string
          integration_id: string
          is_active?: boolean
          settings?: Json | null
          token_cache?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          credentials?: Json | null
          id?: string
          integration_id?: string
          is_active?: boolean
          settings?: Json | null
          token_cache?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_integrations_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "api_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas_diarias: {
        Row: {
          apelido_dispositivo: string | null
          codbar: string
          dia: string
          empresa: string
          id: string
          total_consultas: number | null
        }
        Insert: {
          apelido_dispositivo?: string | null
          codbar: string
          dia: string
          empresa: string
          id?: string
          total_consultas?: number | null
        }
        Update: {
          apelido_dispositivo?: string | null
          codbar?: string
          dia?: string
          empresa?: string
          id?: string
          total_consultas?: number | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          advertiser_id: string
          created_at: string | null
          end_date: string
          id: string
          metadata: Json | null
          name: string
          start_date: string
          status: string | null
          tenant_id: string | null
          total_impressions: number | null
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          advertiser_id: string
          created_at?: string | null
          end_date: string
          id?: string
          metadata?: Json | null
          name: string
          start_date: string
          status?: string | null
          tenant_id?: string | null
          total_impressions?: number | null
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          advertiser_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          metadata?: Json | null
          name?: string
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          total_impressions?: number | null
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "countries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      curiosities: {
        Row: {
          category: string
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          tenant_id: string | null
          title: string
          updated_at: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          tenant_id?: string | null
          title: string
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          tenant_id?: string | null
          title?: string
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curiosities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      detection_logs: {
        Row: {
          age_group: string | null
          attention_duration: number | null
          created_at: string | null
          detected_at: string | null
          device_code: string
          emotion: string | null
          gender: string | null
          id: string
          person_id: string | null
        }
        Insert: {
          age_group?: string | null
          attention_duration?: number | null
          created_at?: string | null
          detected_at?: string | null
          device_code: string
          emotion?: string | null
          gender?: string | null
          id?: string
          person_id?: string | null
        }
        Update: {
          age_group?: string | null
          attention_duration?: number | null
          created_at?: string | null
          detected_at?: string | null
          device_code?: string
          emotion?: string | null
          gender?: string | null
          id?: string
          person_id?: string | null
        }
        Relationships: []
      }
      device_check_logs: {
        Row: {
          created_at: string
          device_id: string
          ean: string | null
          response: Json | null
          status_code: number | null
        }
        Insert: {
          created_at?: string
          device_id: string
          ean?: string | null
          response?: Json | null
          status_code?: number | null
        }
        Update: {
          created_at?: string
          device_id?: string
          ean?: string | null
          response?: Json | null
          status_code?: number | null
        }
        Relationships: []
      }
      device_commands: {
        Row: {
          acknowledged_at: string | null
          command: string
          created_at: string
          device_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          issued_by: string | null
          metadata: Json | null
          payload: Json
          status: string
          tenant_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          command: string
          created_at?: string
          device_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          issued_by?: string | null
          metadata?: Json | null
          payload?: Json
          status?: string
          tenant_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          command?: string
          created_at?: string
          device_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          issued_by?: string | null
          metadata?: Json | null
          payload?: Json
          status?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      device_detection_logs: {
        Row: {
          age: number | null
          age_group: string | null
          attention_duration: number | null
          confidence: number | null
          content_id: string | null
          content_name: string | null
          created_at: string
          detected_at: string
          device_id: string | null
          device_nickname: string | null
          device_serial: string
          emotion: string | null
          emotion_confidence: number | null
          face_descriptor: Json | null
          gender: string | null
          id: string
          is_facing_camera: boolean | null
          metadata: Json | null
          playlist_id: string | null
        }
        Insert: {
          age?: number | null
          age_group?: string | null
          attention_duration?: number | null
          confidence?: number | null
          content_id?: string | null
          content_name?: string | null
          created_at?: string
          detected_at?: string
          device_id?: string | null
          device_nickname?: string | null
          device_serial: string
          emotion?: string | null
          emotion_confidence?: number | null
          face_descriptor?: Json | null
          gender?: string | null
          id?: string
          is_facing_camera?: boolean | null
          metadata?: Json | null
          playlist_id?: string | null
        }
        Update: {
          age?: number | null
          age_group?: string | null
          attention_duration?: number | null
          confidence?: number | null
          content_id?: string | null
          content_name?: string | null
          created_at?: string
          detected_at?: string
          device_id?: string | null
          device_nickname?: string | null
          device_serial?: string
          emotion?: string | null
          emotion_confidence?: number | null
          face_descriptor?: Json | null
          gender?: string | null
          id?: string
          is_facing_camera?: boolean | null
          metadata?: Json | null
          playlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_detection_logs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_detection_logs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      device_execution_logs: {
        Row: {
          command: string
          command_id: string | null
          created_at: string
          device_id: string
          duration_ms: number | null
          id: string
          message: string | null
          payload: Json
          result: string
          tenant_id: string | null
        }
        Insert: {
          command: string
          command_id?: string | null
          created_at?: string
          device_id: string
          duration_ms?: number | null
          id?: string
          message?: string | null
          payload?: Json
          result: string
          tenant_id?: string | null
        }
        Update: {
          command?: string
          command_id?: string | null
          created_at?: string
          device_id?: string
          duration_ms?: number | null
          id?: string
          message?: string | null
          payload?: Json
          result?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_execution_logs_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "device_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      device_group_channels: {
        Row: {
          channel_id: string
          created_at: string
          distribution_channel_id: string | null
          group_id: string
          id: string
          position: number
        }
        Insert: {
          channel_id: string
          created_at?: string
          distribution_channel_id?: string | null
          group_id: string
          id?: string
          position?: number
        }
        Update: {
          channel_id?: string
          created_at?: string
          distribution_channel_id?: string | null
          group_id?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "device_group_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_group_channels_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "device_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      device_group_members: {
        Row: {
          created_at: string
          device_id: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "device_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      device_groups: {
        Row: {
          channel_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          screen_type: string | null
          store_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          screen_type?: string | null
          store_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          screen_type?: string | null
          store_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_groups_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "distribution_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_logs: {
        Row: {
          created_at: string | null
          dispositivo_id: number | null
          event_type: string
          id: string
          payload: Json | null
          serial: string
        }
        Insert: {
          created_at?: string | null
          dispositivo_id?: number | null
          event_type: string
          id?: string
          payload?: Json | null
          serial: string
        }
        Update: {
          created_at?: string | null
          dispositivo_id?: number | null
          event_type?: string
          id?: string
          payload?: Json | null
          serial?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_logs_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id"]
          },
        ]
      }
      device_status_logs: {
        Row: {
          created_at: string
          device_code: string | null
          device_id: string
          device_name: string | null
          id: string
          new_status: string
          old_status: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          device_code?: string | null
          device_id: string
          device_name?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          device_code?: string | null
          device_id?: string
          device_name?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_status_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_table_assignments: {
        Row: {
          assigned_at: string | null
          device_id: string
          display_order: number | null
          display_time: number | null
          id: string
          price_table_id: string
          transition_effect: string | null
        }
        Insert: {
          assigned_at?: string | null
          device_id: string
          display_order?: number | null
          display_time?: number | null
          id?: string
          price_table_id: string
          transition_effect?: string | null
        }
        Update: {
          assigned_at?: string | null
          device_id?: string
          display_order?: number | null
          display_time?: number | null
          id?: string
          price_table_id?: string
          transition_effect?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_table_assignments_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tags: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      device_types: {
        Row: {
          code: string
          created_at: string | null
          default_orientation: string | null
          default_resolution: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          default_orientation?: string | null
          default_resolution?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          default_orientation?: string | null
          default_resolution?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositivos: {
        Row: {
          apelido_interno: string | null
          apps_instalados: string[] | null
          atualizado: string | null
          campanhas: string[] | null
          comando: string | null
          company_id: string | null
          current_media_id: string | null
          current_playlist_id: string | null
          device_uuid: string | null
          empresa: string | null
          external_id: number | null
          grupo_dispositivos: string | null
          id: number
          ip_dispositivo: string | null
          last_heartbeat_at: string | null
          last_proof_at: string | null
          num_filial: string | null
          online: boolean | null
          pin: string | null
          playlist_id: string | null
          serial: string | null
          store_id: string | null
          tipo_da_licenca: string | null
          type: string | null
        }
        Insert: {
          apelido_interno?: string | null
          apps_instalados?: string[] | null
          atualizado?: string | null
          campanhas?: string[] | null
          comando?: string | null
          company_id?: string | null
          current_media_id?: string | null
          current_playlist_id?: string | null
          device_uuid?: string | null
          empresa?: string | null
          external_id?: number | null
          grupo_dispositivos?: string | null
          id?: number
          ip_dispositivo?: string | null
          last_heartbeat_at?: string | null
          last_proof_at?: string | null
          num_filial?: string | null
          online?: boolean | null
          pin?: string | null
          playlist_id?: string | null
          serial?: string | null
          store_id?: string | null
          tipo_da_licenca?: string | null
          type?: string | null
        }
        Update: {
          apelido_interno?: string | null
          apps_instalados?: string[] | null
          atualizado?: string | null
          campanhas?: string[] | null
          comando?: string | null
          company_id?: string | null
          current_media_id?: string | null
          current_playlist_id?: string | null
          device_uuid?: string | null
          empresa?: string | null
          external_id?: number | null
          grupo_dispositivos?: string | null
          id?: number
          ip_dispositivo?: string | null
          last_heartbeat_at?: string | null
          last_proof_at?: string | null
          num_filial?: string | null
          online?: boolean | null
          pin?: string | null
          playlist_id?: string | null
          serial?: string | null
          store_id?: string | null
          tipo_da_licenca?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_channels: {
        Row: {
          created_at: string | null
          description: string | null
          fallback_playlist_id: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          priority: number | null
          rules: Json | null
          source: string | null
          type: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fallback_playlist_id?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          priority?: number | null
          rules?: Json | null
          source?: string | null
          type?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fallback_playlist_id?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          priority?: number | null
          rules?: Json | null
          source?: string | null
          type?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          _id: string | null
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          logo_url: string | null
          logotipo: string | null
          nome: string
          responsavel: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          _id?: string | null
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          logotipo?: string | null
          nome: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          _id?: string | null
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          logotipo?: string | null
          nome?: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      external_editor_sessions: {
        Row: {
          asset_type: string
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          provider: string
          provider_design_id: string | null
          result_media_id: string | null
          session_type: string
          started_at: string | null
          status: string
          target_folder_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_design_id?: string | null
          result_media_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          target_folder_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_design_id?: string | null
          result_media_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: string
          target_folder_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_editor_sessions_result_media_id_fkey"
            columns: ["result_media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_editor_sessions_target_folder_id_fkey"
            columns: ["target_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      global_group_targets: {
        Row: {
          created_at: string
          group_id: string
          id: string
          store_internal_group_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          store_internal_group_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          store_internal_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_group_targets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_group_targets_store_internal_group_id_fkey"
            columns: ["store_internal_group_id"]
            isOneToOne: false
            referencedRelation: "store_internal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_devices: {
        Row: {
          created_at: string
          device_id: string
          group_id: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          group_id: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          group_id?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_devices_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "dispositivos"
            referencedColumns: ["device_uuid"]
          },
          {
            foreignKeyName: "group_devices_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_playlists: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_override: boolean | null
          playlist_id: string
          priority: number | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_override?: boolean | null
          playlist_id: string
          priority?: number | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_override?: boolean | null
          playlist_id?: string
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_playlists_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_playlists_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      group_stores: {
        Row: {
          created_at: string
          group_id: string
          id: string
          store_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          store_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          store_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_stores_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          playlist_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          playlist_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          playlist_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          details: Json | null
          error_rows: number | null
          errors: Json | null
          file_name: string | null
          id: string
          status: string | null
          success_rows: number | null
          total_rows: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_rows?: number | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          status?: string | null
          success_rows?: number | null
          total_rows?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_rows?: number | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          status?: string | null
          success_rows?: number | null
          total_rows?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      imported_products: {
        Row: {
          codbar: string | null
          file_name: string | null
          id: string
          import_date: string | null
          internal_code: string | null
          last_updated: string | null
          name: string
          old_price: number | null
          on_sale: boolean | null
          price: number
          sector: string | null
          unit: string | null
        }
        Insert: {
          codbar?: string | null
          file_name?: string | null
          id?: string
          import_date?: string | null
          internal_code?: string | null
          last_updated?: string | null
          name: string
          old_price?: number | null
          on_sale?: boolean | null
          price: number
          sector?: string | null
          unit?: string | null
        }
        Update: {
          codbar?: string | null
          file_name?: string | null
          id?: string
          import_date?: string | null
          internal_code?: string | null
          last_updated?: string | null
          name?: string
          old_price?: number | null
          on_sale?: boolean | null
          price?: number
          sector?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      impression_logs: {
        Row: {
          advertiser_id: string | null
          campaign_id: string | null
          city_id: string | null
          content_id: string | null
          created_at: string | null
          device_id: string | null
          device_type_id: string | null
          duration: number | null
          id: string
          metadata: Json | null
          played_at: string
          region_id: string | null
          sector_id: string | null
          state_id: string | null
          status: string | null
          store_id: string | null
          tenant_id: string | null
          zone_id: string | null
        }
        Insert: {
          advertiser_id?: string | null
          campaign_id?: string | null
          city_id?: string | null
          content_id?: string | null
          created_at?: string | null
          device_id?: string | null
          device_type_id?: string | null
          duration?: number | null
          id?: string
          metadata?: Json | null
          played_at?: string
          region_id?: string | null
          sector_id?: string | null
          state_id?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id?: string | null
          zone_id?: string | null
        }
        Update: {
          advertiser_id?: string | null
          campaign_id?: string | null
          city_id?: string | null
          content_id?: string | null
          created_at?: string | null
          device_id?: string | null
          device_type_id?: string | null
          duration?: number | null
          id?: string
          metadata?: Json | null
          played_at?: string
          region_id?: string | null
          sector_id?: string | null
          state_id?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impression_logs_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_device_type_id_fkey"
            columns: ["device_type_id"]
            isOneToOne: false
            referencedRelation: "device_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impression_logs_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          instagram_id: string
          is_active: boolean
          media_type: string
          media_url: string | null
          permalink: string | null
          posted_at: string | null
          tenant_id: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          instagram_id: string
          is_active?: boolean
          media_type?: string
          media_url?: string | null
          permalink?: string | null
          posted_at?: string | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          instagram_id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string | null
          permalink?: string | null
          posted_at?: string | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_settings: {
        Row: {
          access_token: string | null
          created_at: string
          fetch_days: number
          id: string
          instagram_user_id: string | null
          is_active: boolean
          last_fetched_at: string | null
          tenant_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          fetch_days?: number
          id?: string
          instagram_user_id?: string | null
          is_active?: boolean
          last_fetched_at?: string | null
          tenant_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          fetch_days?: number
          id?: string
          instagram_user_id?: string | null
          is_active?: boolean
          last_fetched_at?: string | null
          tenant_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lite_products: {
        Row: {
          club_price: number | null
          company_id: string
          created_at: string
          custom_field_name: string | null
          custom_field_value: string | null
          de_por_price: number | null
          description: string
          discount_4th_item: number | null
          ean: string
          id: string
          image_url: string | null
          internal_code: string | null
          is_active: boolean
          leve_x_pague_y: string | null
          normal_price: number
          other_price: number | null
          promo_price: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          club_price?: number | null
          company_id: string
          created_at?: string
          custom_field_name?: string | null
          custom_field_value?: string | null
          de_por_price?: number | null
          description: string
          discount_4th_item?: number | null
          ean: string
          id?: string
          image_url?: string | null
          internal_code?: string | null
          is_active?: boolean
          leve_x_pague_y?: string | null
          normal_price?: number
          other_price?: number | null
          promo_price?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          club_price?: number | null
          company_id?: string
          created_at?: string
          custom_field_name?: string | null
          custom_field_value?: string | null
          de_por_price?: number | null
          description?: string
          discount_4th_item?: number | null
          ean?: string
          id?: string
          image_url?: string | null
          internal_code?: string | null
          is_active?: boolean
          leve_x_pague_y?: string | null
          normal_price?: number
          other_price?: number | null
          promo_price?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lite_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lite_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          auto_delete: boolean | null
          company_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration: number | null
          file_size: number | null
          file_url: string | null
          folder_id: string | null
          id: string
          metadata: Json | null
          name: string
          resolution: string | null
          status: string
          tenant_id: string | null
          thumbnail_url: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          auto_delete?: boolean | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration?: number | null
          file_size?: number | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          resolution?: string | null
          status?: string
          tenant_id?: string | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          auto_delete?: boolean | null
          company_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration?: number | null
          file_size?: number | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          resolution?: string | null
          status?: string
          tenant_id?: string | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_items_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "media_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_play_logs: {
        Row: {
          created_at: string | null
          device_id: string | null
          duration: number | null
          id: string
          media_id: string | null
          played_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          duration?: number | null
          id?: string
          media_id?: string | null
          played_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          duration?: number | null
          id?: string
          media_id?: string | null
          played_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_play_logs_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      media_trash_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          media_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          media_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          media_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_trash_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      medias_view: {
        Row: {
          campanha: string | null
          dispositivo: string | null
          empresa: string | null
          grupo_lojas: string | null
          hora_data: string | null
          id: number
          id_media: string
          qtd_views: number | null
        }
        Insert: {
          campanha?: string | null
          dispositivo?: string | null
          empresa?: string | null
          grupo_lojas?: string | null
          hora_data?: string | null
          id?: number
          id_media: string
          qtd_views?: number | null
        }
        Update: {
          campanha?: string | null
          dispositivo?: string | null
          empresa?: string | null
          grupo_lojas?: string | null
          hora_data?: string | null
          id?: number
          id_media?: string
          qtd_views?: number | null
        }
        Relationships: []
      }
      migration_report: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          step: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          step?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          step?: string | null
        }
        Relationships: []
      }
      monitoring_views: {
        Row: {
          company_id: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          tenant_id: string | null
          token: string
        }
        Insert: {
          company_id?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string | null
          token: string
        }
        Update: {
          company_id?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_views_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "monitoring_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      motivational_quotes: {
        Row: {
          author: string
          created_at: string
          id: string
          image_orientation: string | null
          image_url: string | null
          is_active: boolean
          quote: string
          source: string | null
          tenant_id: string | null
          updated_at: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          author?: string
          created_at?: string
          id?: string
          image_orientation?: string | null
          image_url?: string | null
          is_active?: boolean
          quote: string
          source?: string | null
          tenant_id?: string | null
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          image_orientation?: string | null
          image_url?: string | null
          is_active?: boolean
          quote?: string
          source?: string | null
          tenant_id?: string | null
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motivational_quotes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      newmedias: {
        Row: {
          ativado: boolean | null
          bloco: string | null
          colecoes: string | null
          created_at: string
          data_criacao: string | null
          dias_semana: string | null
          empresa: string | null
          final: string | null
          grupo_lojas: string | null
          id: string | null
          id_m: number
          inicia: string | null
          link: string | null
          modified_date: string | null
          nome: string | null
          ordem: number | null
          range: unknown
          time: number | null
          type: string | null
          views: number | null
          volumeaudio: number | null
        }
        Insert: {
          ativado?: boolean | null
          bloco?: string | null
          colecoes?: string | null
          created_at?: string
          data_criacao?: string | null
          dias_semana?: string | null
          empresa?: string | null
          final?: string | null
          grupo_lojas?: string | null
          id?: string | null
          id_m?: number
          inicia?: string | null
          link?: string | null
          modified_date?: string | null
          nome?: string | null
          ordem?: number | null
          range?: unknown
          time?: number | null
          type?: string | null
          views?: number | null
          volumeaudio?: number | null
        }
        Update: {
          ativado?: boolean | null
          bloco?: string | null
          colecoes?: string | null
          created_at?: string
          data_criacao?: string | null
          dias_semana?: string | null
          empresa?: string | null
          final?: string | null
          grupo_lojas?: string | null
          id?: string | null
          id_m?: number
          inicia?: string | null
          link?: string | null
          modified_date?: string | null
          nome?: string | null
          ordem?: number | null
          range?: unknown
          time?: number | null
          type?: string | null
          views?: number | null
          volumeaudio?: number | null
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          active: boolean | null
          api_article_id: string | null
          api_source: string | null
          category: string | null
          content: string | null
          description: string | null
          feed_id: string | null
          id: string
          image_cached: boolean | null
          image_r2_key: string | null
          image_url: string | null
          imported_at: string
          link: string | null
          published_at: string | null
          slug: string | null
          source: string | null
          source_priority: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          api_article_id?: string | null
          api_source?: string | null
          category?: string | null
          content?: string | null
          description?: string | null
          feed_id?: string | null
          id?: string
          image_cached?: boolean | null
          image_r2_key?: string | null
          image_url?: string | null
          imported_at?: string
          link?: string | null
          published_at?: string | null
          slug?: string | null
          source?: string | null
          source_priority?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          api_article_id?: string | null
          api_source?: string | null
          category?: string | null
          content?: string | null
          description?: string | null
          feed_id?: string | null
          id?: string
          image_cached?: boolean | null
          image_r2_key?: string | null
          image_url?: string | null
          imported_at?: string
          link?: string | null
          published_at?: string | null
          slug?: string | null
          source?: string | null
          source_priority?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "news_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      news_feeds: {
        Row: {
          active: boolean | null
          category: string | null
          collector: string
          created_at: string
          id: string
          name: string
          priority: number | null
          query: string | null
          rss_url: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          collector?: string
          created_at?: string
          id?: string
          name: string
          priority?: number | null
          query?: string | null
          rss_url: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          collector?: string
          created_at?: string
          id?: string
          name?: string
          priority?: number | null
          query?: string | null
          rss_url?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_feeds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      news_settings: {
        Row: {
          active_categories: Json | null
          created_at: string
          display_time: number | null
          id: string
          layout_type: string | null
          max_items: number | null
          tenant_id: string | null
          theme_mode: string | null
          type_view: string | null
          updated_at: string
        }
        Insert: {
          active_categories?: Json | null
          created_at?: string
          display_time?: number | null
          id?: string
          layout_type?: string | null
          max_items?: number | null
          tenant_id?: string | null
          theme_mode?: string | null
          type_view?: string | null
          updated_at?: string
        }
        Update: {
          active_categories?: Json | null
          created_at?: string
          display_time?: number | null
          id?: string
          layout_type?: string | null
          max_items?: number | null
          tenant_id?: string | null
          theme_mode?: string | null
          type_view?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_tips: {
        Row: {
          category: string
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          tenant_id: string | null
          title: string
          updated_at: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          tenant_id?: string | null
          title: string
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          tenant_id?: string | null
          title?: string
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_tips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_logs: {
        Row: {
          category: string
          created_at: string
          device_code: string | null
          device_id: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          device_code?: string | null
          device_id?: string | null
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          device_code?: string | null
          device_id?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_channel_items: {
        Row: {
          channel_id: string | null
          created_at: string | null
          days_of_week: number[] | null
          duration_override: number | null
          end_date: string | null
          end_time: string | null
          global_position: number | null
          id: string
          is_schedule_override: boolean | null
          media_id: string | null
          position: number | null
          start_date: string | null
          start_time: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          duration_override?: number | null
          end_date?: string | null
          end_time?: string | null
          global_position?: number | null
          id?: string
          is_schedule_override?: boolean | null
          media_id?: string | null
          position?: number | null
          start_date?: string | null
          start_time?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          duration_override?: number | null
          end_date?: string | null
          end_time?: string | null
          global_position?: number | null
          id?: string
          is_schedule_override?: boolean | null
          media_id?: string | null
          position?: number | null
          start_date?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      playlist_channels: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          description: string | null
          end_date: string | null
          end_time: string
          id: string
          is_active: boolean
          is_fallback: boolean
          metadata: Json | null
          name: string
          playlist_id: string
          position: number
          start_date: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          is_fallback?: boolean
          metadata?: Json | null
          name: string
          playlist_id: string
          position?: number
          start_date?: string | null
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          is_fallback?: boolean
          metadata?: Json | null
          name?: string
          playlist_id?: string
          position?: number
          start_date?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          ativo: boolean
          conteudo_id: string
          created_at: string | null
          days_of_week: number[] | null
          duracao: number
          duration_override: number | null
          end_date: string | null
          end_time: string | null
          id: string
          is_schedule_override: boolean | null
          media_id: string | null
          ordem: number
          playlist_id: string
          position: number | null
          prioridade: number | null
          start_date: string | null
          start_time: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean
          conteudo_id: string
          created_at?: string | null
          days_of_week?: number[] | null
          duracao?: number
          duration_override?: number | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_schedule_override?: boolean | null
          media_id?: string | null
          ordem: number
          playlist_id: string
          position?: number | null
          prioridade?: number | null
          start_date?: string | null
          start_time?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean
          conteudo_id?: string
          created_at?: string | null
          days_of_week?: number[] | null
          duracao?: number
          duration_override?: number | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_schedule_override?: boolean | null
          media_id?: string | null
          ordem?: number
          playlist_id?: string
          position?: number | null
          prioridade?: number | null
          start_date?: string | null
          start_time?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_playlist_items_media"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_playlist_items_playlist"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          channel_id: string | null
          company_id: string
          content_scale: string | null
          created_at: string | null
          days_of_week: number[] | null
          description: string | null
          end_date: string | null
          end_time: string | null
          fallback_media_id: string | null
          has_channels: boolean | null
          id: string
          is_active: boolean
          is_company_default: boolean
          is_default: boolean
          name: string
          priority: number | null
          schedule: Json | null
          start_date: string | null
          start_time: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          company_id: string
          content_scale?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          fallback_media_id?: string | null
          has_channels?: boolean | null
          id?: string
          is_active?: boolean
          is_company_default?: boolean
          is_default?: boolean
          name?: string
          priority?: number | null
          schedule?: Json | null
          start_date?: string | null
          start_time?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          company_id?: string
          content_scale?: string | null
          created_at?: string | null
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          fallback_media_id?: string | null
          has_channels?: boolean | null
          id?: string
          is_active?: boolean
          is_company_default?: boolean
          is_default?: boolean
          name?: string
          priority?: number | null
          schedule?: Json | null
          start_date?: string | null
          start_time?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_fallback_media_id_fkey"
            columns: ["fallback_media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_check_integrations: {
        Row: {
          auth_body_json: Json
          auth_body_text: string | null
          auth_config: Json | null
          auth_curl: string | null
          auth_headers_json: Json
          auth_method: string | null
          auth_query_params_json: Json
          auth_token_path: string | null
          auth_type: string
          auth_url: string | null
          barcode_param_name: string | null
          barcode_param_type: string
          company_id: string | null
          created_at: string | null
          endpoint_url: string
          environment: string
          headers: Json | null
          id: string
          mapping_config: Json | null
          method: string
          name: string
          request_body_json: Json
          request_body_text: string | null
          request_curl: string | null
          request_headers_json: Json
          request_method: string | null
          request_query_params_json: Json
          request_url: string | null
          request_variables_json: Json
          status: string
          tenant_id: string | null
          token_cache: Json | null
          token_expiration_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          auth_body_json?: Json
          auth_body_text?: string | null
          auth_config?: Json | null
          auth_curl?: string | null
          auth_headers_json?: Json
          auth_method?: string | null
          auth_query_params_json?: Json
          auth_token_path?: string | null
          auth_type: string
          auth_url?: string | null
          barcode_param_name?: string | null
          barcode_param_type: string
          company_id?: string | null
          created_at?: string | null
          endpoint_url: string
          environment?: string
          headers?: Json | null
          id?: string
          mapping_config?: Json | null
          method: string
          name: string
          request_body_json?: Json
          request_body_text?: string | null
          request_curl?: string | null
          request_headers_json?: Json
          request_method?: string | null
          request_query_params_json?: Json
          request_url?: string | null
          request_variables_json?: Json
          status?: string
          tenant_id?: string | null
          token_cache?: Json | null
          token_expiration_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          auth_body_json?: Json
          auth_body_text?: string | null
          auth_config?: Json | null
          auth_curl?: string | null
          auth_headers_json?: Json
          auth_method?: string | null
          auth_query_params_json?: Json
          auth_token_path?: string | null
          auth_type?: string
          auth_url?: string | null
          barcode_param_name?: string | null
          barcode_param_type?: string
          company_id?: string | null
          created_at?: string | null
          endpoint_url?: string
          environment?: string
          headers?: Json | null
          id?: string
          mapping_config?: Json | null
          method?: string
          name?: string
          request_body_json?: Json
          request_body_text?: string | null
          request_curl?: string | null
          request_headers_json?: Json
          request_method?: string | null
          request_query_params_json?: Json
          request_url?: string | null
          request_variables_json?: Json
          status?: string
          tenant_id?: string | null
          token_cache?: Json | null
          token_expiration_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_check_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      price_check_logs: {
        Row: {
          barcode: string | null
          created_at: string | null
          device_id: string | null
          error_message: string | null
          id: string
          integration_id: string | null
          mapped_product: Json | null
          request_payload: Json | null
          request_snapshot: Json | null
          response_payload: Json | null
          response_snapshot: Json | null
          response_time_ms: number | null
          status_code: number | null
          store_code: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          device_id?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          mapped_product?: Json | null
          request_payload?: Json | null
          request_snapshot?: Json | null
          response_payload?: Json | null
          response_snapshot?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          store_code?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          device_id?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string | null
          mapped_product?: Json | null
          request_payload?: Json | null
          request_snapshot?: Json | null
          response_payload?: Json | null
          response_snapshot?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          store_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_check_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "price_check_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_table_items: {
        Row: {
          active: boolean
          codbar: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          old_price: number | null
          on_sale: boolean | null
          price: number
          price_table_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          codbar?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          old_price?: number | null
          on_sale?: boolean | null
          price: number
          price_table_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          codbar?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          old_price?: number | null
          on_sale?: boolean | null
          price?: number
          price_table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_table_items_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tables: {
        Row: {
          created_at: string
          id: string
          items_count: number | null
          last_updated: string | null
          name: string
          sector: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_count?: number | null
          last_updated?: string | null
          name: string
          sector?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          items_count?: number | null
          last_updated?: string | null
          name?: string
          sector?: string | null
          status?: string
        }
        Relationships: []
      }
      processing_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          metadata: Json | null
          progress: number
          result: string | null
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          progress?: number
          result?: string | null
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json | null
          progress?: number
          result?: string | null
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_cache: {
        Row: {
          company_id: string
          created_at: string
          ean: string
          expires_at: string
          id: string
          image_url: string | null
          product_data: Json
          store_code: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          ean: string
          expires_at: string
          id?: string
          image_url?: string | null
          product_data: Json
          store_code: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          ean?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          product_data?: Json
          store_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_cache_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_display_settings: {
        Row: {
          accent_color: string | null
          company_id: string
          container_primary_color: string | null
          container_secondary_color: string | null
          created_at: string
          custom_font_css_url: string | null
          enable_color_extraction: boolean
          id: string
          image_background_color: string | null
          image_position: string
          layout_preset: number
          original_price_font_family: string | null
          original_price_font_size: number
          price_font_family: string | null
          price_font_size: number
          price_position: string
          remove_image_background: boolean
          subtitle_font_family: string | null
          subtitle_font_size: number
          title_font_family: string | null
          title_font_size: number
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          company_id: string
          container_primary_color?: string | null
          container_secondary_color?: string | null
          created_at?: string
          custom_font_css_url?: string | null
          enable_color_extraction?: boolean
          id?: string
          image_background_color?: string | null
          image_position?: string
          layout_preset?: number
          original_price_font_family?: string | null
          original_price_font_size?: number
          price_font_family?: string | null
          price_font_size?: number
          price_position?: string
          remove_image_background?: boolean
          subtitle_font_family?: string | null
          subtitle_font_size?: number
          title_font_family?: string | null
          title_font_size?: number
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          company_id?: string
          container_primary_color?: string | null
          container_secondary_color?: string | null
          created_at?: string
          custom_font_css_url?: string | null
          enable_color_extraction?: boolean
          id?: string
          image_background_color?: string | null
          image_position?: string
          layout_preset?: number
          original_price_font_family?: string | null
          original_price_font_size?: number
          price_font_family?: string | null
          price_font_size?: number
          price_position?: string
          remove_image_background?: boolean
          subtitle_font_family?: string | null
          subtitle_font_size?: number
          title_font_family?: string | null
          title_font_size?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_display_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lookup_analytics: {
        Row: {
          age_estimate: number | null
          age_group: string | null
          ai_category: string | null
          ai_description: string | null
          ai_enriched: boolean | null
          ai_enriched_at: string | null
          ai_tags: string[] | null
          company_id: string | null
          created_at: string
          device_id: string | null
          ean: string
          emotion: string | null
          emotion_confidence: number | null
          first_lookup_at: string
          gender: string | null
          id: string
          last_lookup_at: string
          lookup_count: number | null
          lookup_date: string
          product_data: Json | null
          product_name: string | null
          store_code: string | null
          updated_at: string
        }
        Insert: {
          age_estimate?: number | null
          age_group?: string | null
          ai_category?: string | null
          ai_description?: string | null
          ai_enriched?: boolean | null
          ai_enriched_at?: string | null
          ai_tags?: string[] | null
          company_id?: string | null
          created_at?: string
          device_id?: string | null
          ean: string
          emotion?: string | null
          emotion_confidence?: number | null
          first_lookup_at?: string
          gender?: string | null
          id?: string
          last_lookup_at?: string
          lookup_count?: number | null
          lookup_date?: string
          product_data?: Json | null
          product_name?: string | null
          store_code?: string | null
          updated_at?: string
        }
        Update: {
          age_estimate?: number | null
          age_group?: string | null
          ai_category?: string | null
          ai_description?: string | null
          ai_enriched?: boolean | null
          ai_enriched_at?: string | null
          ai_tags?: string[] | null
          company_id?: string | null
          created_at?: string
          device_id?: string | null
          ean?: string
          emotion?: string | null
          emotion_confidence?: number | null
          first_lookup_at?: string
          gender?: string | null
          id?: string
          last_lookup_at?: string
          lookup_count?: number | null
          lookup_date?: string
          product_data?: Json | null
          product_name?: string | null
          store_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_lookup_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lookup_logs: {
        Row: {
          company_id: string | null
          created_at: string
          device_id: string | null
          ean: string
          error_message: string | null
          id: string
          latency_ms: number | null
          status: string
          store_code: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          device_id?: string | null
          ean: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          status: string
          store_code?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          device_id?: string | null
          ean?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          status?: string
          store_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_lookup_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_queries_log: {
        Row: {
          apelido: string | null
          codigo_etiqueta: string | null
          codigo_produto: string | null
          consulted_at: string | null
          created_at: string | null
          descricao_produto: string | null
          device_id: string
          ean: string | null
          id: number
          link_imagem: string | null
          loja: string | null
          status_code: number | null
        }
        Insert: {
          apelido?: string | null
          codigo_etiqueta?: string | null
          codigo_produto?: string | null
          consulted_at?: string | null
          created_at?: string | null
          descricao_produto?: string | null
          device_id: string
          ean?: string | null
          id?: never
          link_imagem?: string | null
          loja?: string | null
          status_code?: number | null
        }
        Update: {
          apelido?: string | null
          codigo_etiqueta?: string | null
          codigo_produto?: string | null
          consulted_at?: string | null
          created_at?: string | null
          descricao_produto?: string | null
          device_id?: string
          ean?: string | null
          id?: never
          link_imagem?: string | null
          loja?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      product_recommendations: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          ean: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          score: number | null
          source_data: Json | null
          tags: string[] | null
          target_age_max: number | null
          target_age_min: number | null
          target_gender: string | null
          target_mood: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ean: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          score?: number | null
          source_data?: Json | null
          tags?: string[] | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_gender?: string | null
          target_mood?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ean?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          score?: number | null
          source_data?: Json | null
          tags?: string[] | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_gender?: string | null
          target_mood?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          apelido_dispositivo: string | null
          codbar: string
          description: string | null
          dia: string | null
          dispositivo: string | null
          empresa: string | null
          filial: string | null
          id: string | null
          last_update: string | null
          num_consultas: number | null
        }
        Insert: {
          apelido_dispositivo?: string | null
          codbar: string
          description?: string | null
          dia?: string | null
          dispositivo?: string | null
          empresa?: string | null
          filial?: string | null
          id?: string | null
          last_update?: string | null
          num_consultas?: number | null
        }
        Update: {
          apelido_dispositivo?: string | null
          codbar?: string
          description?: string | null
          dia?: string | null
          dispositivo?: string | null
          empresa?: string | null
          filial?: string | null
          id?: string | null
          last_update?: string | null
          num_consultas?: number | null
        }
        Relationships: []
      }
      produtos_tako: {
        Row: {
          codbar: string | null
          codigo_interno: string | null
          created_at: string | null
          data_atualizacao: string | null
          descricao: string
          empresa: string | null
          file_name: string | null
          id: string
          oferta: boolean | null
          setor: string | null
          unidade: string | null
          valor1: number
          valor2: number | null
        }
        Insert: {
          codbar?: string | null
          codigo_interno?: string | null
          created_at?: string | null
          data_atualizacao?: string | null
          descricao: string
          empresa?: string | null
          file_name?: string | null
          id?: string
          oferta?: boolean | null
          setor?: string | null
          unidade?: string | null
          valor1: number
          valor2?: number | null
        }
        Update: {
          codbar?: string | null
          codigo_interno?: string | null
          created_at?: string | null
          data_atualizacao?: string | null
          descricao?: string
          empresa?: string | null
          file_name?: string | null
          id?: string
          oferta?: boolean | null
          setor?: string | null
          unidade?: string | null
          valor1?: number
          valor2?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      qrcode_campaigns: {
        Row: {
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          config: Json
          created_at: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          media_id: string | null
          qr_url: string | null
          scans_count: number
          short_url: string | null
          starts_at: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          config?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          media_id?: string | null
          qr_url?: string | null
          scans_count?: number
          short_url?: string | null
          starts_at?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          config?: Json
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          media_id?: string | null
          qr_url?: string | null
          scans_count?: number
          short_url?: string | null
          starts_at?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qrcode_campaigns_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qrcode_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qrcode_scan_logs: {
        Row: {
          campaign_id: string
          device_id: string | null
          id: string
          ip_hash: string | null
          metadata: Json | null
          scanned_at: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          device_id?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          scanned_at?: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          device_id?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          scanned_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qrcode_scan_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "qrcode_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_access_logs: {
        Row: {
          command: string
          created_at: string | null
          device_id: number | null
          id: string
          payload: Json | null
          token_id: string | null
        }
        Insert: {
          command: string
          created_at?: string | null
          device_id?: number | null
          id?: string
          payload?: Json | null
          token_id?: string | null
        }
        Update: {
          command?: string
          created_at?: string | null
          device_id?: number | null
          id?: string
          payload?: Json | null
          token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_access_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "quick_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_access_tokens: {
        Row: {
          company_id: string | null
          created_at: string | null
          device_id: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          store_id: string | null
          tenant_id: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          device_id?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          store_id?: string | null
          tenant_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          device_id?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          store_id?: string | null
          tenant_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_access_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_access_tokens_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_access_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string | null
          country_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          country_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          store_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          store_id: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          store_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sectors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string | null
          country_id: string | null
          created_at: string | null
          id: string
          name: string
          region_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          country_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          region_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          country_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          region_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_internal_group_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          internal_group_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          internal_group_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          internal_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_internal_group_devices_internal_group_id_fkey"
            columns: ["internal_group_id"]
            isOneToOne: false
            referencedRelation: "store_internal_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      store_internal_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          playlist_id: string | null
          store_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          playlist_id?: string | null
          store_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          playlist_id?: string | null
          store_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_internal_groups_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_internal_groups_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_internal_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tags: {
        Row: {
          created_at: string | null
          id: string
          store_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          store_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          store_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tags_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          bairro: string | null
          cep: string | null
          city_id: string | null
          cnpj: string | null
          code: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          phone: string | null
          playlist_id: string | null
          regional_responsavel: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bairro?: string | null
          cep?: string | null
          city_id?: string | null
          cnpj?: string | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          phone?: string | null
          playlist_id?: string | null
          regional_responsavel?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bairro?: string | null
          cep?: string | null
          city_id?: string | null
          cnpj?: string | null
          code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          playlist_id?: string | null
          regional_responsavel?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sugeridos: {
        Row: {
          codbar: string
          codbar_1: string | null
          codbar_2: string | null
          created_at: string | null
          descri_1: string | null
          descri_2: string | null
          id: number
        }
        Insert: {
          codbar: string
          codbar_1?: string | null
          codbar_2?: string | null
          created_at?: string | null
          descri_1?: string | null
          descri_2?: string | null
          id?: number
        }
        Update: {
          codbar?: string
          codbar_1?: string | null
          codbar_2?: string | null
          created_at?: string | null
          descri_1?: string | null
          descri_2?: string | null
          id?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_admin_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_admin_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "tenant_admin_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_licenses: {
        Row: {
          allow_video_upload: boolean
          coupon_code: string | null
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          max_device_groups: number
          max_devices: number
          max_media_uploads: number
          max_playlists: number
          max_stores: number
          plan: Database["public"]["Enums"]["license_plan"]
          starts_at: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_video_upload?: boolean
          coupon_code?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          max_device_groups?: number
          max_devices?: number
          max_media_uploads?: number
          max_playlists?: number
          max_stores?: number
          plan?: Database["public"]["Enums"]["license_plan"]
          starts_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_video_upload?: boolean
          coupon_code?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          max_device_groups?: number
          max_devices?: number
          max_media_uploads?: number
          max_playlists?: number
          max_stores?: number
          plan?: Database["public"]["Enums"]["license_plan"]
          starts_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_migration_at: string | null
          max_devices: number | null
          max_stores: number | null
          max_users: number | null
          metadata: Json | null
          migration_version: number | null
          name: string
          schema_name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_migration_at?: string | null
          max_devices?: number | null
          max_stores?: number | null
          max_users?: number | null
          metadata?: Json | null
          migration_version?: number | null
          name: string
          schema_name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_migration_at?: string | null
          max_devices?: number | null
          max_stores?: number | null
          max_users?: number | null
          metadata?: Json | null
          migration_version?: number | null
          name?: string
          schema_name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_marketing: {
        Row: {
          codbar: string
          created_at: string | null
          dispositivo: string | null
          empresa: string
          id: number
          id_midia: string
          link_midia: string
          updated_at: string | null
        }
        Insert: {
          codbar: string
          created_at?: string | null
          dispositivo?: string | null
          empresa: string
          id?: number
          id_midia: string
          link_midia: string
          updated_at?: string | null
        }
        Update: {
          codbar?: string
          created_at?: string | null
          dispositivo?: string | null
          empresa?: string
          id?: number
          id_midia?: string
          link_midia?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tts_audio_cache: {
        Row: {
          audio_url: string
          created_at: string | null
          id: string
          last_used_at: string | null
          text_content: string
          text_hash: string
          use_count: number | null
          voice_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          text_content: string
          text_hash: string
          use_count?: number | null
          voice_id?: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          text_content?: string
          text_hash?: string
          use_count?: number | null
          voice_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          role: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id: string
          role?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      user_tenant_mappings: {
        Row: {
          created_at: string | null
          id: string
          is_tenant_admin: boolean | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_tenant_admin?: boolean | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_tenant_admin?: boolean | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tenant_mappings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      users: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          last_sign_in: string | null
          name: string | null
          role: Database["public"]["Enums"]["user_role_type"]
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          last_sign_in?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          last_sign_in?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      weather_locations: {
        Row: {
          city: string
          created_at: string
          current_temp: number | null
          daily_forecast: Json | null
          display_time: number | null
          hourly_forecast: Json | null
          humidity: number | null
          id: string
          is_active: boolean
          is_default: boolean
          last_updated_at: string | null
          latitude: number | null
          layout_type: string | null
          longitude: number | null
          openweather_city_id: string | null
          raw_data: Json | null
          state: string
          tenant_id: string | null
          theme_color: string | null
          type_view: string | null
          updated_at: string
          weather_description: string | null
          weather_icon: string | null
          wind_speed: number | null
        }
        Insert: {
          city: string
          created_at?: string
          current_temp?: number | null
          daily_forecast?: Json | null
          display_time?: number | null
          hourly_forecast?: Json | null
          humidity?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last_updated_at?: string | null
          latitude?: number | null
          layout_type?: string | null
          longitude?: number | null
          openweather_city_id?: string | null
          raw_data?: Json | null
          state: string
          tenant_id?: string | null
          theme_color?: string | null
          type_view?: string | null
          updated_at?: string
          weather_description?: string | null
          weather_icon?: string | null
          wind_speed?: number | null
        }
        Update: {
          city?: string
          created_at?: string
          current_temp?: number | null
          daily_forecast?: Json | null
          display_time?: number | null
          hourly_forecast?: Json | null
          humidity?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          last_updated_at?: string | null
          latitude?: number | null
          layout_type?: string | null
          longitude?: number | null
          openweather_city_id?: string | null
          raw_data?: Json | null
          state?: string
          tenant_id?: string | null
          theme_color?: string | null
          type_view?: string | null
          updated_at?: string
          weather_description?: string | null
          weather_icon?: string | null
          wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sector_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sector_id: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sector_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      filtered_medias: {
        Row: {
          ativo: boolean | null
          bloco: string | null
          colecoes: string | null
          created_at: string | null
          data_criacao: string | null
          dias_semana: string | null
          empresa: string | null
          final: string | null
          grupo_lojas: string | null
          id: number | null
          id_media: string | null
          inicia: string | null
          link: string | null
          modified_date: string | null
          nome: string | null
          ordem: number | null
          range: unknown
          time: number | null
          type: string | null
          views: number | null
          volumeaudio: number | null
        }
        Insert: {
          ativo?: boolean | null
          bloco?: string | null
          colecoes?: string | null
          created_at?: string | null
          data_criacao?: string | null
          dias_semana?: string | null
          empresa?: string | null
          final?: string | null
          grupo_lojas?: string | null
          id?: number | null
          id_media?: string | null
          inicia?: string | null
          link?: string | null
          modified_date?: string | null
          nome?: string | null
          ordem?: number | null
          range?: unknown
          time?: number | null
          type?: string | null
          views?: number | null
          volumeaudio?: number | null
        }
        Update: {
          ativo?: boolean | null
          bloco?: string | null
          colecoes?: string | null
          created_at?: string | null
          data_criacao?: string | null
          dias_semana?: string | null
          empresa?: string | null
          final?: string | null
          grupo_lojas?: string | null
          id?: number | null
          id_media?: string | null
          inicia?: string | null
          link?: string | null
          modified_date?: string | null
          nome?: string | null
          ordem?: number | null
          range?: unknown
          time?: number | null
          type?: string | null
          views?: number | null
          volumeaudio?: number | null
        }
        Relationships: []
      }
      produtos_sorted: {
        Row: {
          apelido_dispositivo: string | null
          codbar: string | null
          description: string | null
          dia: string | null
          dispositivo: string | null
          empresa: string | null
          last_update: string | null
          num_consultas: number | null
        }
        Insert: {
          apelido_dispositivo?: string | null
          codbar?: string | null
          description?: string | null
          dia?: string | null
          dispositivo?: string | null
          empresa?: string | null
          last_update?: string | null
          num_consultas?: number | null
        }
        Update: {
          apelido_dispositivo?: string | null
          codbar?: string | null
          description?: string | null
          dia?: string | null
          dispositivo?: string | null
          empresa?: string | null
          last_update?: string | null
          num_consultas?: number | null
        }
        Relationships: []
      }
      vw_auditoria_relatorio: {
        Row: {
          detalhes: string | null
          etapa: string | null
          executado_em: string | null
          registros_afetados: number | null
          status: string | null
        }
        Insert: {
          detalhes?: string | null
          etapa?: string | null
          executado_em?: string | null
          registros_afetados?: never
          status?: string | null
        }
        Update: {
          detalhes?: string | null
          etapa?: string | null
          executado_em?: string | null
          registros_afetados?: never
          status?: string | null
        }
        Relationships: []
      }
      vw_user_creation_status: {
        Row: {
          auth_created_at: string | null
          auth_user_id: string | null
          company_id: string | null
          email: string | null
          profile_created_at: string | null
          profile_id: string | null
          profile_role: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "vw_user_creation_status"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_playlist_item: {
        Args: {
          ativo: boolean
          conteudo_id: string
          duracao: number
          ordem: number
          playlist_id: string
          tipo: string
        }
        Returns: {
          ativo: boolean
          conteudo_id: string
          created_at: string | null
          days_of_week: number[] | null
          duracao: number
          duration_override: number | null
          end_date: string | null
          end_time: string | null
          id: string
          is_schedule_override: boolean | null
          media_id: string | null
          ordem: number
          playlist_id: string
          position: number | null
          prioridade: number | null
          start_date: string | null
          start_time: string | null
          tipo: string
        }
        SetofOptions: {
          from: "*"
          to: "playlist_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auditoria_listar_dispositivos_orfaos: {
        Args: never
        Returns: {
          apelido: string
          empresa: string
          id: number
          serial: string
          ultimo_heartbeat: string
        }[]
      }
      auditoria_verificar_integridade: {
        Args: never
        Returns: {
          categoria: string
          problema: string
          quantidade: number
          severidade: string
        }[]
      }
      cadastrar_dispositivo:
        | {
            Args: {
              android_id: string
              apelido_dispositivo: string
              codigo_empresa: string
              device_name: string
              num_filial: string
              serial_number: string
            }
            Returns: Json
          }
        | { Args: { payload: Json }; Returns: Json }
      can_access_tenant_data: {
        Args: { check_tenant_id: string; check_user_id: string }
        Returns: boolean
      }
      check_media_in_use: { Args: { media_id: string }; Returns: boolean }
      check_tenant_limit: {
        Args: {
          p_current_count: number
          p_resource: string
          p_tenant_id: string
        }
        Returns: boolean
      }
      create_dispositivo: { Args: { payload: Json }; Returns: Json }
      create_dispositivo_direct: { Args: { data: Json }; Returns: Json }
      create_tenant_schema: {
        Args: { p_schema_name: string; p_tenant_id: string }
        Returns: undefined
      }
      create_trade_marketing:
        | {
            Args: {
              p_codbar: string
              p_codbar_suger_1?: string
              p_codbar_suger_2?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_codbar: string
              p_codbar_suger_1?: string
              p_codbar_suger_2?: string
              p_desc_prod?: string
              p_desc_sug_1?: string
              p_desc_sug_2?: string
            }
            Returns: undefined
          }
      delete_all_consultas: { Args: never; Returns: Json }
      delete_by_serial: { Args: { serial_param: string }; Returns: Json }
      delete_consultas_por_dispositivo: {
        Args: { p_dispositivo: string }
        Returns: Json
      }
      delete_consultas_por_filial: { Args: { p_filial: string }; Returns: Json }
      delete_dispositivo: { Args: { dispositivo_id: number }; Returns: Json }
      delete_list_medias: { Args: { media_ids: Json }; Returns: Json }
      delete_playlist_item: { Args: { p_item_id: string }; Returns: undefined }
      delete_trade_marketing:
        | { Args: { _codbar: string }; Returns: Json }
        | { Args: { _codbar: string; _empresa: string }; Returns: Json }
      device_heartbeat:
        | { Args: { p_device_code: string }; Returns: undefined }
        | {
            Args: {
              p_current_playlist_id?: string
              p_device_token: string
              p_status: string
            }
            Returns: Json
          }
      drop_tenant_schema: {
        Args: { p_confirm: string; p_schema_name: string; p_tenant_id: string }
        Returns: undefined
      }
      filter_by_serial: { Args: { serial_param: string }; Returns: Json }
      filtro_medias:
        | {
            Args: {
              day_of_week: string
              end_date: string
              grupo_loja: string
              start_date: string
            }
            Returns: Json
          }
        | {
            Args: {
              day_of_week: string
              end_date: string
              grupo_loja: string
              param_ativado: boolean
              start_date: string
            }
            Returns: Json
          }
      generate_device_token: { Args: never; Returns: string }
      generate_media_report: {
        Args: { end_date: string; start_date: string }
        Returns: {
          data: string
          dispositivo: string
          grupo_lojas: string
          hora: string
          id_media: string
          nome: string
          total_views: number
        }[]
      }
      get_content_by_type: {
        Args: { p_content_type: string }
        Returns: {
          id: string
          nome: string
        }[]
      }
      get_current_user_company_id: { Args: never; Returns: string }
      get_device_config: { Args: { p_device_token: string }; Returns: Json }
      get_device_weather_settings: {
        Args: { p_device_code: string }
        Returns: Json
      }
      get_dispositivo_por_serial: {
        Args: { p_serial: string }
        Returns: {
          apelido_interno: string
          apps_instalados: string[]
          atualizado: string
          campanhas: string[]
          empresa: string
          grupo_dispositivos: string
          id: number
          ip_dispositivo: string
          num_filial: string
          online: boolean
          pin: string
          serial: string
          tipo_da_licenca: string
          type: string
        }[]
      }
      get_dispositivos: { Args: never; Returns: Json }
      get_group_effective_playlist: {
        Args: { p_group_id: string }
        Returns: string
      }
      get_group_path_json: { Args: { group_uuid: string }; Returns: Json }
      get_groups_hierarchy: { Args: { p_tenant_id: string }; Returns: Json }
      get_medias_by_month: {
        Args: { p_ano: number; p_mes: number }
        Returns: {
          codbar: string
          created_at: string
          dispositivo: string
          empresa: string
          id: number
          id_midia: string
          link_midia: string
          updated_at: string
        }[]
      }
      get_medias_by_month_and_empresa:
        | {
            Args: never
            Returns: {
              p_ano: string
              p_empresa: string
            }[]
          }
        | {
            Args: {
              filtro_ano?: number
              filtro_empresa?: string
              filtro_mes?: number
            }
            Returns: {
              campanha: string
              dispositivo: string
              empresa: string
              grupo_lojas: string
              hora_data: string
              id: number
              id_media: string
              p_ano: number
              p_mes: number
              qtd_views: number
            }[]
          }
      get_midia_by_codbar: {
        Args: { _codbar: string }
        Returns: {
          codbar: string
          created_at: string
          dispositivo: string
          empresa: string
          id: number
          id_midia: string
          link_midia: string
          updated_at: string
        }[]
      }
      get_pending_device_command: {
        Args: { p_device_id: string; p_device_token: string }
        Returns: {
          command: string
          created_at: string
          device_id: string
          id: string
          metadata: Json
          status: string
        }[]
      }
      get_playlist_items: {
        Args: { p_playlist_id: string }
        Returns: {
          ativo: boolean
          conteudo_id: string
          created_at: string | null
          days_of_week: number[] | null
          duracao: number
          duration_override: number | null
          end_date: string | null
          end_time: string | null
          id: string
          is_schedule_override: boolean | null
          media_id: string | null
          ordem: number
          playlist_id: string
          position: number | null
          prioridade: number | null
          start_date: string | null
          start_time: string | null
          tipo: string
        }[]
        SetofOptions: {
          from: "*"
          to: "playlist_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_produto: { Args: { codbar_param: string }; Returns: Json }
      get_produto_por_codbar: {
        Args: { p_codbar: string }
        Returns: {
          apelido_dispositivo: string
          codbar: string
          description: string
          dia: string
          dispositivo: string
          empresa: string
          last_update: string
          num_consultas: number
        }[]
      }
      get_produtos_sorted:
        | {
            Args: { p_order: string }
            Returns: {
              apelido_dispositivo: string | null
              codbar: string
              description: string | null
              dia: string | null
              dispositivo: string | null
              empresa: string | null
              filial: string | null
              id: string | null
              last_update: string | null
              num_consultas: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "produtos"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_apelido_dispositivo?: string; p_order_by?: string }
            Returns: {
              apelido_dispositivo: string
              codbar: string
              description: string
              dia: string
              dispositivo: string
              empresa: string
              last_update: string
              num_consultas: number
            }[]
          }
      get_public_device_info: {
        Args: { p_device_code: string }
        Returns: {
          blocked_message: string
          camera_enabled: boolean
          company_id: string
          company_slug: string
          current_playlist_id: string
          id: string
          is_blocked: boolean
          last_sync_requested_at: string
          name: string
          override_media_data: Json
          override_media_expires_at: string
          override_media_id: string
          store_code: string
          store_id: string
        }[]
      }
      get_public_playlists_data: {
        Args: { p_channel_ids: string[]; p_playlist_ids: string[] }
        Returns: Json
      }
      get_tenant_license: { Args: { p_tenant_id: string }; Returns: Json }
      get_trade_marketing: {
        Args: never
        Returns: {
          codbar: string
          created_at: string
          dispositivo: string
          empresa: string
          id: number
          id_midia: string
          link_midia: string
          updated_at: string
        }[]
      }
      get_user_tenant_id: { Args: { check_user_id?: string }; Returns: string }
      get_user_tenant_id_strict: {
        Args: { check_user_id?: string }
        Returns: string
      }
      get_user_tenants: {
        Args: { check_user_id: string }
        Returns: {
          tenant_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_store_access: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      has_tenant_access: {
        Args: { check_tenant_id: string; check_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_member_of_tenant: {
        Args: { check_tenant_id: string; check_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_tenant_admin: { Args: { check_user_id?: string }; Returns: boolean }
      issue_reload_command_to_affected_devices: {
        Args: { p_device_ids: string[] }
        Returns: undefined
      }
      list_tenant_schemas: {
        Args: never
        Returns: {
          created_at: string
          is_active: boolean
          schema_name: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      listar_dispositivos_por_empresa: {
        Args: { empresa_param: string }
        Returns: {
          apelido_interno: string | null
          apps_instalados: string[] | null
          atualizado: string | null
          campanhas: string[] | null
          comando: string | null
          company_id: string | null
          current_media_id: string | null
          current_playlist_id: string | null
          device_uuid: string | null
          empresa: string | null
          external_id: number | null
          grupo_dispositivos: string | null
          id: number
          ip_dispositivo: string | null
          last_heartbeat_at: string | null
          last_proof_at: string | null
          num_filial: string | null
          online: boolean | null
          pin: string | null
          playlist_id: string | null
          serial: string | null
          store_id: string | null
          tipo_da_licenca: string | null
          type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "dispositivos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_media_trash_action: {
        Args: { p_action: string; p_media_id: string }
        Returns: undefined
      }
      mark_device_command_executed: {
        Args: {
          p_command_id: string
          p_device_token: string
          p_error?: string
          p_status?: string
        }
        Returns: undefined
      }
      register_device: {
        Args: {
          p_company_id?: string
          p_device_code: string
          p_group_id?: string
          p_name: string
          p_store_code?: string
          p_store_id?: string
        }
        Returns: Json
      }
      register_impression: {
        Args: {
          p_campaign_id?: string
          p_content_id: string
          p_device_token: string
          p_duration?: number
        }
        Returns: Json
      }
      register_play_logs: {
        Args: { p_device_token: string; p_logs: Json }
        Returns: Json
      }
      resolve_segment_device_ids: {
        Args: {
          p_limit?: number
          p_only_online?: boolean
          p_segment_id: string
        }
        Returns: {
          device_id: string
        }[]
      }
      resolve_segment_device_stats: {
        Args: {
          p_limit?: number
          p_only_online?: boolean
          p_segment_id: string
        }
        Returns: {
          device_count: number
          store_count: number
        }[]
      }
      seed_tenant_defaults: {
        Args: { p_company_id: string; p_tenant_id: string }
        Returns: undefined
      }
      sum_consultas_por_apelido: {
        Args: { p_apelido_dispositivo: string }
        Returns: Json
      }
      sum_consultas_por_dispositivo: {
        Args: { p_dispositivo_id: string }
        Returns: number
      }
      sync_cloudflare_media: {
        Args: {
          p_company_folder: string
          p_files: string[]
          p_tenant_id: string
        }
        Returns: undefined
      }
      sync_device_playlist: {
        Args: { p_device_id: string }
        Returns: undefined
      }
      update_by_serial: {
        Args: {
          apelido_interno: string
          apps_instalados: string[]
          campanhas: string[]
          empresa: string
          grupo_dispositivos: string
          ip_dispositivo: string
          num_filial: string
          online: boolean
          pin: string
          serial_param: string
          tipo_da_licenca: string
          type: string
        }
        Returns: Json
      }
      update_codbar_sugeridos:
        | {
            Args: {
              p_codbar: string
              p_codbar_1?: string
              p_codbar_2?: string
              p_descri_1?: string
              p_descri_2?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_codbar: string
              p_codbar_suger_1?: string
              p_codbar_suger_2?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_codbar: string
              p_codbar_suger_1?: string
              p_codbar_suger_2?: string
              p_desc_prod?: string
              p_desc_sug_1?: string
              p_desc_sug_2?: string
            }
            Returns: undefined
          }
      update_dispositivo: {
        Args: {
          apelido_interno: string
          apps_instalados: string[]
          campanhas: string[]
          dispositivo_id: number
          empresa: string
          grupo_dispositivos: string
          ip_dispositivo: string
          num_filial: string
          online: boolean
          pin: string
          serial: string
          tipo_da_licenca: string
          type: string
        }
        Returns: Json
      }
      update_list_medias: {
        Args: { grupo_loja: string; updates: Json }
        Returns: Json
      }
      update_num_consultas: { Args: { p_codbar: string }; Returns: undefined }
      update_playlist_item: {
        Args: { p_item_id: string; p_updates: Json }
        Returns: {
          ativo: boolean
          conteudo_id: string
          created_at: string | null
          days_of_week: number[] | null
          duracao: number
          duration_override: number | null
          end_date: string | null
          end_time: string | null
          id: string
          is_schedule_override: boolean | null
          media_id: string | null
          ordem: number
          playlist_id: string
          position: number | null
          prioridade: number | null
          start_date: string | null
          start_time: string | null
          tipo: string
        }
        SetofOptions: {
          from: "*"
          to: "playlist_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_playlist_item_order: {
        Args: { p_item_id: string; p_ordem: number }
        Returns: {
          ativo: boolean
          conteudo_id: string
          created_at: string | null
          days_of_week: number[] | null
          duracao: number
          duration_override: number | null
          end_date: string | null
          end_time: string | null
          id: string
          is_schedule_override: boolean | null
          media_id: string | null
          ordem: number
          playlist_id: string
          position: number | null
          prioridade: number | null
          start_date: string | null
          start_time: string | null
          tipo: string
        }
        SetofOptions: {
          from: "*"
          to: "playlist_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_produto: {
        Args: {
          apelido_dispositivo_param: string
          codbar_param: string
          description_param: string
          dispositivo_param: string
          num_consultas_param: number
        }
        Returns: Json
      }
      upsert_medias: { Args: { medias: Json }; Returns: Json }
      upsert_produto:
        | {
            Args: {
              apelido_dispositivo_param: string
              codbar_param: string
              description_param: string
              dispositivo_param: string
              num_consultas_param: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_apelido_dispositivo?: string
              p_codbar: string
              p_description?: string
              p_dia?: string
              p_dispositivo?: string
              p_empresa?: string
              p_last_update?: string
              p_num_consultas?: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_apelido_dispositivo: string
              p_codbar: string
              p_description: string
              p_dispositivo: string
              p_empresa: string
              p_filial: string
              p_num_consultas: number
            }
            Returns: Json
          }
        | { Args: { produtos: Json }; Returns: Json }
      upsert_sugeridos: {
        Args: {
          p_codbar: string
          p_codbar_1?: string
          p_codbar_2?: string
          p_descri_1?: string
          p_descri_2?: string
        }
        Returns: undefined
      }
      upsert_trade_marketing: {
        Args: {
          _codbar: string
          _dispositivo: string
          _empresa: string
          _id_midia: string
          _link_midia: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin_global"
        | "admin_regional"
        | "admin_loja"
        | "operador_conteudo"
        | "tecnico"
        | "admin"
        | "marketing"
      campaign_type:
        | "satisfaction_survey"
        | "product_link"
        | "instant_coupon"
        | "quick_loyalty"
        | "whatsapp_chat"
        | "photo_feedback"
        | "digital_catalog"
        | "daily_raffle"
        | "tutorial_recipe"
        | "instagram_store"
        | "refer_earn"
        | "accessibility_info"
      license_plan: "lite" | "standard" | "enterprise"
      user_role_type: "admin" | "user"
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
      app_role: [
        "admin_global",
        "admin_regional",
        "admin_loja",
        "operador_conteudo",
        "tecnico",
        "admin",
        "marketing",
      ],
      campaign_type: [
        "satisfaction_survey",
        "product_link",
        "instant_coupon",
        "quick_loyalty",
        "whatsapp_chat",
        "photo_feedback",
        "digital_catalog",
        "daily_raffle",
        "tutorial_recipe",
        "instagram_store",
        "refer_earn",
        "accessibility_info",
      ],
      license_plan: ["lite", "standard", "enterprise"],
      user_role_type: ["admin", "user"],
    },
  },
} as const
