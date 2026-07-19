export interface SignerByTokenResult {
  id: string
  document_id: string
  signer_email: string
  signer_name: string | null
  status: 'pending' | 'viewed' | 'signed'
  signed_at: string | null
  signing_token: string
  documents: {
    title: string
    original_pdf_url: string
    final_pdf_url?: string | null
    status: string
    final_pdf_available?: boolean
  }
}

export interface DocumentCompletionResult {
  title: string
  created_by: string
  original_pdf_url: string
  signers: Array<{ signer_email: string; signer_name: string | null }> | null
  fields: Array<{
    id: string
    field_type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox'
    page_number: number
    x: number
    y: number
    width: number
    height: number
  }> | null
  placements: Array<{ field_id: string; signature_id: string }> | null
  owner_email: string | null
  cc_metadata: string | null
  audit_trail: Array<{
    action: string
    user_email: string
    user_name: string | null
    created_at: string
    metadata: string | null
    ip_address: string | null
  }> | null
}

export interface ViewerDocumentResult {
  id: string
  title: string
  original_pdf_url: string
  final_pdf_url?: string | null
  status: string
}

export interface ViewerSignerResult {
  signer_email: string
  signer_name: string | null
  status: string
}

export interface SigningPackageResult {
  signer: SignerByTokenResult
  fields: Database['public']['Tables']['signature_fields']['Row'][]
  placements: Database['public']['Tables']['signature_placements']['Row'][]
  audit_trail: Database['public']['Tables']['audit_trail']['Row'][]
}

export interface ViewerPackageResult {
  document: ViewerDocumentResult
  signers: ViewerSignerResult[]
}

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
      document_viewers: {
        Row: {
          id: string
          document_id: string
          viewer_email: string
          viewing_token: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          viewer_email: string
          viewing_token?: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          viewer_email?: string
          viewing_token?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_all_signers_signed: {
        Args: { p_document_id: string; p_current_signer_id: string }
        Returns: boolean
      }
      get_document_for_completion: {
        Args: { p_document_id: string }
        Returns: DocumentCompletionResult
      }
      get_document_for_viewer: {
        Args: { p_document_id: string }
        Returns: ViewerDocumentResult[]
      }
      get_signer_by_token: {
        Args: { p_token: string }
        Returns: SignerByTokenResult | null
      }
      get_signers_for_viewer: {
        Args: { p_document_id: string }
        Returns: ViewerSignerResult[]
      }
      mark_document_completed: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      save_final_pdf_url: {
        Args: { p_document_id: string; p_final_pdf_url: string }
        Returns: undefined
      }
      update_signer_status_by_id: {
        Args: { p_signer_id: string; p_status: string }
        Returns: undefined
      }
      get_signing_package: {
        Args: { p_token: string }
        Returns: SigningPackageResult | null
      }
      replace_signature_fields: {
        Args: { p_document_id: string; p_fields: unknown }
        Returns: Database['public']['Tables']['signature_fields']['Row'][]
      }
      update_document_signer_with_fields: {
        Args: { p_signer_id: string; p_signer_email: string; p_signer_name?: string | null }
        Returns: Database['public']['Tables']['document_signers']['Row']
      }
      remove_document_signer_with_fields: {
        Args: { p_signer_id: string }
        Returns: undefined
      }
      add_signature_placement_by_token: {
        Args: { p_token: string; p_field_id: string; p_signature_id: string }
        Returns: Database['public']['Tables']['signature_placements']['Row']
      }
      update_signer_status_by_token: {
        Args: { p_token: string; p_status: string }
        Returns: undefined
      }
      add_audit_entry_by_token: {
        Args: { p_token: string; p_action: string; p_metadata?: string | null }
        Returns: Database['public']['Tables']['audit_trail']['Row']
      }
      check_all_signers_signed_by_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      mark_document_completed_by_token: {
        Args: { p_token: string }
        Returns: undefined
      }
      get_document_for_completion_by_token: {
        Args: { p_token: string }
        Returns: DocumentCompletionResult | null
      }
      save_final_pdf_url_by_token: {
        Args: { p_token: string; p_final_pdf_url: string }
        Returns: undefined
      }
      create_document_viewer: {
        Args: { p_document_id: string; p_viewer_email: string }
        Returns: string
      }
      get_viewer_package: {
        Args: { p_token: string }
        Returns: ViewerPackageResult | null
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

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type SignatureField = Database['public']['Tables']['signature_fields']['Row']
export type SignatureFieldInsert = Database['public']['Tables']['signature_fields']['Insert']
export type DocumentSigner = Database['public']['Tables']['document_signers']['Row']
export type SignaturePlacement = Database['public']['Tables']['signature_placements']['Row']
export type AuditTrailEntry = Database['public']['Tables']['audit_trail']['Row']
