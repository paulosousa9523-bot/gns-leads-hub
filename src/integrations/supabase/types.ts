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
      call_logs: {
        Row: {
          atualizado: string
          criado: string
          duracao_segundos: number
          encerrado_em: string | null
          id: string
          iniciado_em: string
          lead_id: string
          observacoes: string | null
          provider: string | null
          provider_call_sid: string | null
          recording_url: string | null
          status: Database["public"]["Enums"]["call_status"]
          telefone: string
          usuario: string
        }
        Insert: {
          atualizado?: string
          criado?: string
          duracao_segundos?: number
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string
          lead_id: string
          observacoes?: string | null
          provider?: string | null
          provider_call_sid?: string | null
          recording_url?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          telefone: string
          usuario: string
        }
        Update: {
          atualizado?: string
          criado?: string
          duracao_segundos?: number
          encerrado_em?: string | null
          id?: string
          iniciado_em?: string
          lead_id?: string
          observacoes?: string | null
          provider?: string | null
          provider_call_sid?: string | null
          recording_url?: string | null
          status?: Database["public"]["Enums"]["call_status"]
          telefone?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          ativo: boolean
          criado: string
          enviado_por: string | null
          id: string
          mime_type: string | null
          nome: string
          storage_path: string
          tamanho: number | null
        }
        Insert: {
          ativo?: boolean
          criado?: string
          enviado_por?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          storage_path: string
          tamanho?: number | null
        }
        Update: {
          ativo?: boolean
          criado?: string
          enviado_por?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          storage_path?: string
          tamanho?: number | null
        }
        Relationships: []
      }
      generated_contracts: {
        Row: {
          criado: string
          gerado_por: string
          id: string
          lead_id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho: number | null
          template_id: string | null
        }
        Insert: {
          criado?: string
          gerado_por: string
          id?: string
          lead_id: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho?: number | null
          template_id?: string | null
        }
        Update: {
          criado?: string
          gerado_por?: string
          id?: string
          lead_id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho?: number | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_actions: {
        Row: {
          acao: string
          criado: string
          detalhes: Json | null
          id: string
          lead_id: string | null
          usuario: string
        }
        Insert: {
          acao: string
          criado?: string
          detalhes?: Json | null
          id?: string
          lead_id?: string | null
          usuario: string
        }
        Update: {
          acao?: string
          criado?: string
          detalhes?: Json | null
          id?: string
          lead_id?: string | null
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_actions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documents: {
        Row: {
          categoria: string
          criado: string
          id: string
          lead_id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho: number | null
        }
        Insert: {
          categoria: string
          criado?: string
          id?: string
          lead_id: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho?: number | null
        }
        Update: {
          categoria?: string
          criado?: string
          id?: string
          lead_id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          bairro_cliente: string | null
          cep_cliente: string | null
          chamado: boolean
          cnpj: string | null
          contrato_status: string | null
          cpf: string | null
          criado: string
          endereco_cliente: string | null
          estado_civil: string | null
          followup: string | null
          id: string
          movido_em: string
          nacionalidade: string | null
          nome: string
          numero_endereco: string | null
          obs: string | null
          phone: string
          phone2: string | null
          phone3: string | null
          phone4: string | null
          phone5: string | null
          processo: string | null
          profissao: string | null
          responsavel_juridico: string | null
          responsavel_juridico_em: string | null
          responsavel_juridico_por: string | null
          rg_cliente: string | null
          status: string
          tipo_processo: string | null
          tribunal: string | null
          valor_causa: number | null
          veiculo: string | null
          vendedor: string
        }
        Insert: {
          bairro_cliente?: string | null
          cep_cliente?: string | null
          chamado?: boolean
          cnpj?: string | null
          contrato_status?: string | null
          cpf?: string | null
          criado?: string
          endereco_cliente?: string | null
          estado_civil?: string | null
          followup?: string | null
          id?: string
          movido_em?: string
          nacionalidade?: string | null
          nome: string
          numero_endereco?: string | null
          obs?: string | null
          phone: string
          phone2?: string | null
          phone3?: string | null
          phone4?: string | null
          phone5?: string | null
          processo?: string | null
          profissao?: string | null
          responsavel_juridico?: string | null
          responsavel_juridico_em?: string | null
          responsavel_juridico_por?: string | null
          rg_cliente?: string | null
          status?: string
          tipo_processo?: string | null
          tribunal?: string | null
          valor_causa?: number | null
          veiculo?: string | null
          vendedor: string
        }
        Update: {
          bairro_cliente?: string | null
          cep_cliente?: string | null
          chamado?: boolean
          cnpj?: string | null
          contrato_status?: string | null
          cpf?: string | null
          criado?: string
          endereco_cliente?: string | null
          estado_civil?: string | null
          followup?: string | null
          id?: string
          movido_em?: string
          nacionalidade?: string | null
          nome?: string
          numero_endereco?: string | null
          obs?: string | null
          phone?: string
          phone2?: string | null
          phone3?: string | null
          phone4?: string | null
          phone5?: string | null
          processo?: string | null
          profissao?: string | null
          responsavel_juridico?: string | null
          responsavel_juridico_em?: string | null
          responsavel_juridico_por?: string | null
          rg_cliente?: string | null
          status?: string
          tipo_processo?: string | null
          tribunal?: string | null
          valor_causa?: number | null
          veiculo?: string | null
          vendedor?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          criado: string
          display_name: string
          id: string
          restricted_vendors: string[] | null
        }
        Insert: {
          criado?: string
          display_name: string
          id: string
          restricted_vendors?: string[] | null
        }
        Update: {
          criado?: string
          display_name?: string
          id?: string
          restricted_vendors?: string[] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_display_name: { Args: never; Returns: string }
      current_restricted_vendors: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_internal_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "vendedor" | "gestor" | "juridico" | "admin_restrito"
      call_status:
        | "iniciando"
        | "em_curso"
        | "atendida"
        | "nao_atendida"
        | "ocupado"
        | "falhou"
        | "encerrada"
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
      app_role: ["vendedor", "gestor", "juridico", "admin_restrito"],
      call_status: [
        "iniciando",
        "em_curso",
        "atendida",
        "nao_atendida",
        "ocupado",
        "falhou",
        "encerrada",
      ],
    },
  },
} as const
