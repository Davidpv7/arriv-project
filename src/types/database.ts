
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
            "backpack_folders": {
                  Row: {
                    "created_at": string,"id": string,"kind": Database["public"]['Enums']["folder_kind"] | null,"name": string | null,"owner_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["folder_kind"] | null,"name"?: string | null,"owner_id": string,"position"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["folder_kind"] | null,"name"?: string | null,"owner_id"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "backpack_folders_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"blocks": {
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
                    "city": string | null,"created_at": string,"created_by": string | null,"description": string,"id": string,"is_private": boolean,"kind": Database["public"]['Enums']["community_kind"],"language": string | null,"member_count": number,"name": string,"slug": string,"stamp_color": string,"tags": (string)[],"visa_subclass": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_private"?: boolean,"kind": Database["public"]['Enums']["community_kind"],"language"?: string | null,"member_count"?: number,"name": string,"slug"?: string,"stamp_color"?: string,"tags"?: (string)[],"visa_subclass"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_private"?: boolean,"kind"?: Database["public"]['Enums']["community_kind"],"language"?: string | null,"member_count"?: number,"name"?: string,"slug"?: string,"stamp_color"?: string,"tags"?: (string)[],"visa_subclass"?: string | null
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
                },"conversation_invites": {
                  Row: {
                    "conversation_id": string,"created_at": string,"invited_by": string | null,"invitee_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"created_at"?: string,"invited_by"?: string | null,"invitee_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"created_at"?: string,"invited_by"?: string | null,"invitee_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_invites_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_invites_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_invites_invitee_id_fkey"
      columns: ["invitee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_members": {
                  Row: {
                    "conversation_id": string,"joined_at": string,"last_read_at": string,"muted": boolean,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"joined_at"?: string,"last_read_at"?: string,"muted"?: boolean,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"joined_at"?: string,"last_read_at"?: string,"muted"?: boolean,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_members_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "community_id": string | null,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["conversation_kind"],"last_message_at": string,"title": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "community_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["conversation_kind"],"last_message_at"?: string,"title"?: string | null
                  }
                  Update: {
                    "community_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["conversation_kind"],"last_message_at"?: string,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_community_id_fkey"
      columns: ["community_id"]
isOneToOne: true
      referencedRelation: "communities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "created_at": string,"folder_id": string,"id": string,"mime_type": string,"name": string,"owner_id": string,"size_bytes": number,"storage_path": string,"updated_at": string,"uploaded_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"folder_id": string,"id"?: string,"mime_type": string,"name": string,"owner_id": string,"size_bytes": number,"storage_path": string,"updated_at"?: string,"uploaded_by": string
                  }
                  Update: {
                    "created_at"?: string,"folder_id"?: string,"id"?: string,"mime_type"?: string,"name"?: string,"owner_id"?: string,"size_bytes"?: number,"storage_path"?: string,"updated_at"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_folder_id_owner_id_fkey"
      columns: ["folder_id","owner_id"]
isOneToOne: false
      referencedRelation: "backpack_folders"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "documents_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "attachment_mime": string | null,"attachment_name": string | null,"attachment_path": string | null,"body": string | null,"conversation_id": string,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": number,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_mime"?: string | null,"attachment_name"?: string | null,"attachment_path"?: string | null,"body"?: string | null,"conversation_id": string,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: never,"sender_id": string
                  }
                  Update: {
                    "attachment_mime"?: string | null,"attachment_name"?: string | null,"attachment_path"?: string | null,"body"?: string | null,"conversation_id"?: string,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: never,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"milestone_documents": {
                  Row: {
                    "created_at": string,"document_id": string,"milestone_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_id": string,"milestone_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"document_id"?: string,"milestone_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestone_documents_document_id_user_id_fkey"
      columns: ["document_id","user_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "milestone_documents_milestone_id_user_id_fkey"
      columns: ["milestone_id","user_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "milestone_documents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"milestones": {
                  Row: {
                    "created_at": string,"due_on": string | null,"happened_on": string | null,"id": string,"kind": Database["public"]['Enums']["milestone_kind"],"notes": string | null,"place": string | null,"remind_on": string | null,"reminded_at": string | null,"status": Database["public"]['Enums']["milestone_status"],"title": string,"updated_at": string,"user_id": string,"visa_subclass": string | null,"visibility": Database["public"]['Enums']["visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"due_on"?: string | null,"happened_on"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["milestone_kind"],"notes"?: string | null,"place"?: string | null,"remind_on"?: string | null,"reminded_at"?: string | null,"status": Database["public"]['Enums']["milestone_status"],"title": string,"updated_at"?: string,"user_id": string,"visa_subclass"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Update: {
                    "created_at"?: string,"due_on"?: string | null,"happened_on"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["milestone_kind"],"notes"?: string | null,"place"?: string | null,"remind_on"?: string | null,"reminded_at"?: string | null,"status"?: Database["public"]['Enums']["milestone_status"],"title"?: string,"updated_at"?: string,"user_id"?: string,"visa_subclass"?: string | null,"visibility"?: Database["public"]['Enums']["visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestones_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string | null,"id": string,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
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
                    "author_id": string,"body": string,"comment_count": number,"community_id": string | null,"created_at": string,"deleted_at": string | null,"edited_at": string | null,"id": string,"kind": Database["public"]['Enums']["post_kind"],"like_count": number,"milestone_id": string | null,"stamp": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"comment_count"?: number,"community_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"like_count"?: number,"milestone_id"?: string | null,"stamp"?: Json | null
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"comment_count"?: number,"community_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"edited_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["post_kind"],"like_count"?: number,"milestone_id"?: string | null,"stamp"?: Json | null
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
    },{
      foreignKeyName: "posts_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "milestones"
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
                },"push_tokens": {
                  Row: {
                    "platform": string,"token": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "platform": string,"token": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "platform"?: string,"token"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
"create_group":
{ Args: { "p_invitee_ids": (string)[],"p_title": string }; Returns: string
                           },
"delete_comment":
{ Args: { "p_comment": string }; Returns: undefined
                           },
"delete_message":
{ Args: { "p_message": number }; Returns: undefined
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
"like_count": number,
"milestone_id": string | null,
"stamp": Json | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "posts"
        isOneToOne: false
        isSetofReturn: true
      } },
"get_inbox":
{ Args: Record<PropertyKey, never>; Returns: {
              "community_id": string,"conversation_id": string,"kind": Database["public"]['Enums']["conversation_kind"],"last_message_at": string,"last_message_body": string,"last_message_has_attachment": boolean,"last_message_id": number,"last_message_sender_id": string,"muted": boolean,"other_user_id": string,"title": string,"unread_count": number
            }[]
                           },
"get_or_create_direct":
{ Args: { "p_other_user": string }; Returns: string
                           },
"get_stamps":
{ Args: { "p_user": string }; Returns: {
              "happened_on": string,"id": string,"kind": Database["public"]['Enums']["milestone_kind"],"place": string,"title": string,"visa_subclass": string
            }[]
                           },
"invite_to_group":
{ Args: { "p_conversation": string,"p_user_ids": (string)[] }; Returns: number
                           },
"my_blocks":
{ Args: Record<PropertyKey, never>; Returns: {
              "blocked_id": string,"created_at": string,"display_name": string,"handle": string
            }[]
                           },
"register_push_token":
{ Args: { "p_platform": string,"p_token": string }; Returns: undefined
                           },
"respond_to_group_invite":
{ Args: { "p_accept": boolean,"p_conversation": string }; Returns: undefined
                           },
"suggest_communities":
{ Args: { "p_limit"?: number }; Returns: {
              "city": string | null,
"created_at": string,
"created_by": string | null,
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
      } },
"transfer_community_ownership":
{ Args: { "p_community": string,"p_new_owner": string }; Returns: undefined
                           }
          }
          Enums: {
            "community_kind": "city"|"visa"|"language"|"culture"|"interest","connection_status": "pending"|"accepted","conversation_kind": "direct"|"group"|"community","folder_kind": "identity"|"visa"|"police"|"education"|"work"|"health"|"other","member_role": "owner"|"moderator"|"member","milestone_kind": "visa"|"arrival"|"education"|"work"|"home"|"pr"|"citizenship"|"other","milestone_status": "done"|"upcoming","post_kind": "post"|"question"|"journey_update","tier": "free"|"member"|"professional","user_role": "user"|"admin","visibility": "public"|"connections"|"private"
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
            "community_kind": ["city", "visa", "language", "culture", "interest"],"connection_status": ["pending", "accepted"],"conversation_kind": ["direct", "group", "community"],"folder_kind": ["identity", "visa", "police", "education", "work", "health", "other"],"member_role": ["owner", "moderator", "member"],"milestone_kind": ["visa", "arrival", "education", "work", "home", "pr", "citizenship", "other"],"milestone_status": ["done", "upcoming"],"post_kind": ["post", "question", "journey_update"],"tier": ["free", "member", "professional"],"user_role": ["user", "admin"],"visibility": ["public", "connections", "private"]
          }
        }
} as const
