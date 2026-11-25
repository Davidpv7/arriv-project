
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"deleted_at": string | null,"id": string,"parent_id": string | null,"post_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"parent_id"?: string | null,"post_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"parent_id"?: string | null,"post_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"communities": {
                  Row: {
                    "city": string | null,"created_at": string,"created_by": string,"description": string,"id": string,"is_private": boolean,"kind": Database["public"]['Enums']["community_kind"],"language": string | null,"member_count": number,"name": string,"slug": string,"stamp_color": string,"tags": (string)[],"visa_subclass": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"created_by": string,"description"?: string,"id"?: string,"is_private"?: boolean,"kind": Database["public"]['Enums']["community_kind"],"language"?: string | null,"member_count"?: number,"name": string,"slug"?: string,"stamp_color"?: string,"tags"?: (string)[],"visa_subclass"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"created_by"?: string,"description"?: string,"id"?: string,"is_private"?: boolean,"kind"?: Database["public"]['Enums']["community_kind"],"language"?: string | null,"member_count"?: number,"name"?: string,"slug"?: string,"stamp_color"?: string,"tags"?: (string)[],"visa_subclass"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "communities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"community_members": {
                  Row: {
                    "community_id": string,"joined_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id": string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "community_id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_members_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"connections": {
                  Row: {
                    "accepted_at": string | null,"addressee_id": string,"created_at": string,"requester_id": string,"status": Database["public"]['Enums']["connection_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"addressee_id": string,"created_at"?: string,"requester_id": string,"status"?: Database["public"]['Enums']["connection_status"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"addressee_id"?: string,"created_at"?: string,"requester_id"?: string,"status"?: Database["public"]['Enums']["connection_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "connections_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_likes": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_media": {
                  Row: {
                    "height": number | null,"id": string,"position": number,"post_id": string,"storage_path": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "height"?: number | null,"id"?: string,"position"?: number,"post_id": string,"storage_path": string,"width"?: number | null
                  }
                  Update: {
                    "height"?: number | null,"id"?: string,"position"?: number,"post_id"?: string,"storage_path"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_media_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string,"body": string,"comment_count": number,"community_id": string | null,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": string,"kind": Database["public"]['Enums']["post_kind"],"like_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"comment_count"?: number,"community_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"like_count"?: number
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"comment_count"?: number,"community_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"like_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "posts_community_id_fkey"
      columns: ["community_id"]
isOneToOne: false
      referencedRelation: "communities"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_visas": {
                  Row: {
                    "updated_at": string,"user_id": string,"visa_label": string | null,"visa_subclass": string | null,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "updated_at"?: string,"user_id": string,"visa_label"?: string | null,"visa_subclass"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "updated_at"?: string,"user_id"?: string,"visa_label"?: string | null,"visa_subclass"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_visas_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "arrived_on": string | null,"avatar_path": string | null,"bio": string | null,"city": string | null,"created_at": string,"display_name": string,"handle": string,"id": string,"locale": string,"onboarded_at": string | null,"origin_country": string | null,"role": Database["public"]['Enums']["user_role"],"tier": Database["public"]['Enums']["tier"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arrived_on"?: string | null,"avatar_path"?: string | null,"bio"?: string | null,"city"?: string | null,"created_at"?: string,"display_name": string,"handle": string,"id": string,"locale"?: string,"onboarded_at"?: string | null,"origin_country"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"tier"?: Database["public"]['Enums']["tier"],"updated_at"?: string
                  }
                  Update: {
                    "arrived_on"?: string | null,"avatar_path"?: string | null,"bio"?: string | null,"city"?: string | null,"created_at"?: string,"display_name"?: string,"handle"?: string,"id"?: string,"locale"?: string,"onboarded_at"?: string | null,"origin_country"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"tier"?: Database["public"]['Enums']["tier"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "connection_count":
{ Args: { "p_user": string }; Returns: number
                           },
"delete_comment":
{ Args: { "p_comment": string }; Returns: undefined
                           },
"delete_post":
{ Args: { "p_post": string }; Returns: undefined
                           },
"get_home_feed":
{ Args: { "p_cursor"?: string,"p_limit"?: number }; Returns: {
              "author_id": string,
"body": string,
"comment_count": number,
"community_id": string | null,
"created_at": string,
"deleted_at": string | null,
"edited_at": string | null,
"id": string,
"kind": Database["public"]['Enums']["post_kind"],
"like_count": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "posts"
        isOneToOne: false
        isSetofReturn: true
      } },
"my_blocks":
{ Args: Record<PropertyKey, never>; Returns: {
              "blocked_id": string,"created_at": string,"display_name": string,"handle": string
            }[]
                           },
"suggest_communities":
{ Args: { "p_limit"?: number }; Returns: {
              "city": string | null,
"created_at": string,
"created_by": string,
"description": string,
"id": string,
"is_private": boolean,
"kind": Database["public"]['Enums']["community_kind"],
"language": string | null,
"member_count": number,
"name": string,
"slug": string,
"stamp_color": string,
"tags": (string)[],
"visa_subclass": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "communities"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            "community_kind": "city"|"visa"|"language"|"culture"|"interest","connection_status": "pending"|"accepted","member_role": "owner"|"moderator"|"member","post_kind": "post"|"question"|"journey_update","tier": "free"|"member"|"professional","user_role": "user"|"admin","visibility": "public"|"connections"|"private"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "community_kind": ["city", "visa", "language", "culture", "interest"],"connection_status": ["pending", "accepted"],"member_role": ["owner", "moderator", "member"],"post_kind": ["post", "question", "journey_update"],"tier": ["free", "member", "professional"],"user_role": ["user", "admin"],"visibility": ["public", "connections", "private"]
          }
        }
} as const
