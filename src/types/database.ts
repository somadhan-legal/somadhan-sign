export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          title: string
          original_pdf_url: string
          final_pdf_url: string | null
          created_by: string
          status: 'draft' | 'pending' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          original_pdf_url: string
          final_pdf_url?: string | null
          created_by: string
          status?: 'draft' | 'pending' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          original_pdf_url?: string
          final_pdf_url?: string | null
          created_by?: string
          status?: 'draft' | 'pending' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      signature_fields: {
        Row: {
          id: string
          document_id: string
          page_number: number
          x: number
          y: number
          width: number
          height: number
          assigned_to_email: string
          field_type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox'
          field_order: number
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          page_number: number
          x: number
          y: number
          width: number
          height: number
          assigned_to_email: string
          field_type?: 'signature' | 'initials' | 'date' | 'text' | 'checkbox'
          field_order?: number
          label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          page_number?: number
          x?: number
          y?: number
          width?: number
          height?: number
          assigned_to_email?: string
          field_type?: 'signature' | 'initials' | 'date' | 'text' | 'checkbox'
          field_order?: number
          label?: string | null
          created_at?: string
        }
        Relationships: []
      }
      document_signers: {
        Row: {
          id: string
          document_id: string
          signer_email: string
          signer_name: string | null
          status: 'pending' | 'viewed' | 'signed'
          signed_at: string | null
          user_id: string | null
          signing_token: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          signer_email: string
          signer_name?: string | null
          status?: 'pending' | 'viewed' | 'signed'
          signed_at?: string | null
          user_id?: string | null
          signing_token?: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          signer_email?: string
          signer_name?: string | null
          status?: 'pending' | 'viewed' | 'signed'
          signed_at?: string | null
          user_id?: string | null
          signing_token?: string
          created_at?: string
        }
        Relationships: []
      }
      signatures: {
        Row: {
          id: string
          user_id: string
          signature_data: string
          type: 'drawn' | 'uploaded' | 'typed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          signature_data: string
          type?: 'drawn' | 'uploaded' | 'typed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          signature_data?: string
          type?: 'drawn' | 'uploaded' | 'typed'
          created_at?: string
        }
        Relationships: []
      }
      signature_placements: {
        Row: {
          id: string
          document_id: string
          field_id: string
          signer_id: string | null
          signer_email: string
          signature_id: string
          signed_at: string
        }
        Insert: {
          id?: string
          document_id: string
          field_id: string
          signer_id?: string | null
          signer_email: string
          signature_id: string
          signed_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          field_id?: string
          signer_id?: string | null
          signer_email?: string
          signature_id?: string
          signed_at?: string
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          id: string
          document_id: string
          action: string
          user_email: string
          user_name: string | null
          ip_address: string | null
          metadata: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          action: string
          user_email: string
          user_name?: string | null
          ip_address?: string | null
          metadata?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          action?: string
          user_email?: string
          user_name?: string | null
          ip_address?: string | null
          metadata?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type SignatureField = Database['public']['Tables']['signature_fields']['Row']
export type SignatureFieldInsert = Database['public']['Tables']['signature_fields']['Insert']
export type DocumentSigner = Database['public']['Tables']['document_signers']['Row']
export type DocumentSignerInsert = Database['public']['Tables']['document_signers']['Insert']
export type Signature = Database['public']['Tables']['signatures']['Row']
export type SignaturePlacement = Database['public']['Tables']['signature_placements']['Row']
export type AuditTrailEntry = Database['public']['Tables']['audit_trail']['Row']
export type AuditTrailInsert = Database['public']['Tables']['audit_trail']['Insert']
