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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      calorie_tracking: {
        Row: {
          created_at: string | null
          date: string
          id: string
          net_calories: number | null
          total_calories_burned: number | null
          total_calories_consumed: number | null
          total_carbs_consumed: number | null
          total_fats_consumed: number | null
          total_protein_consumed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          net_calories?: number | null
          total_calories_burned?: number | null
          total_calories_consumed?: number | null
          total_carbs_consumed?: number | null
          total_fats_consumed?: number | null
          total_protein_consumed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          net_calories?: number | null
          total_calories_burned?: number | null
          total_calories_consumed?: number | null
          total_carbs_consumed?: number | null
          total_fats_consumed?: number | null
          total_protein_consumed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_type: string | null
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_type?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_type?: string | null
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          calories_per_minute_high: number | null
          calories_per_minute_low: number | null
          calories_per_minute_medium: number | null
          category: string
          created_at: string | null
          description: string | null
          equipment: string[] | null
          id: string
          instructions: string[] | null
          muscle_groups: string[] | null
          name: string
        }
        Insert: {
          calories_per_minute_high?: number | null
          calories_per_minute_low?: number | null
          calories_per_minute_medium?: number | null
          category: string
          created_at?: string | null
          description?: string | null
          equipment?: string[] | null
          id?: string
          instructions?: string[] | null
          muscle_groups?: string[] | null
          name: string
        }
        Update: {
          calories_per_minute_high?: number | null
          calories_per_minute_low?: number | null
          calories_per_minute_medium?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          equipment?: string[] | null
          id?: string
          instructions?: string[] | null
          muscle_groups?: string[] | null
          name?: string
        }
        Relationships: []
      }
      fitness_goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          goal_type: string
          id: string
          status: string | null
          target_date: string | null
          target_value: number
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          goal_type: string
          id?: string
          status?: string | null
          target_date?: string | null
          target_value: number
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          goal_type?: string
          id?: string
          status?: string | null
          target_date?: string | null
          target_value?: number
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_metrics: {
        Row: {
          arms: number | null
          body_fat_percentage: number | null
          chest: number | null
          date: string
          hips: number | null
          id: string
          logged_at: string | null
          notes: string | null
          thighs: number | null
          user_id: string
          waist: number | null
          weight: number | null
        }
        Insert: {
          arms?: number | null
          body_fat_percentage?: number | null
          chest?: number | null
          date: string
          hips?: number | null
          id?: string
          logged_at?: string | null
          notes?: string | null
          thighs?: number | null
          user_id: string
          waist?: number | null
          weight?: number | null
        }
        Update: {
          arms?: number | null
          body_fat_percentage?: number | null
          chest?: number | null
          date?: string
          hips?: number | null
          id?: string
          logged_at?: string | null
          notes?: string | null
          thighs?: number | null
          user_id?: string
          waist?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      ingredient_images: {
        Row: {
          created_at: string | null
          extracted_ingredients: Json | null
          extraction_confidence: number | null
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          extracted_ingredients?: Json | null
          extraction_confidence?: number | null
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          extracted_ingredients?: Json | null
          extraction_confidence?: number | null
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredient_substitutions: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          original_ingredient: string
          ratio: string | null
          reason: string | null
          substitute_ingredient: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          original_ingredient: string
          ratio?: string | null
          reason?: string | null
          substitute_ingredient: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          original_ingredient?: string
          ratio?: string | null
          reason?: string | null
          substitute_ingredient?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          category: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          name: string
          quantity: number | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          name: string
          quantity?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          name?: string
          quantity?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          food_items: Json
          id: string
          logged_at: string | null
          meal_type: string
          notes: string | null
          recipe_id: string | null
          total_calories: number
          total_carbs: number | null
          total_fats: number | null
          total_protein: number | null
          user_id: string
        }
        Insert: {
          food_items: Json
          id?: string
          logged_at?: string | null
          meal_type: string
          notes?: string | null
          recipe_id?: string | null
          total_calories: number
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          user_id: string
        }
        Update: {
          food_items?: Json
          id?: string
          logged_at?: string | null
          meal_type?: string
          notes?: string | null
          recipe_id?: string | null
          total_calories?: number
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "saved_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          sources: Json | null
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          sources?: Json | null
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          sources?: Json | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_snapshots: {
        Row: {
          avg_calories_per_day: number | null
          avg_protein_per_day: number | null
          body_fat_percentage: number | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          total_workouts_this_week: number | null
          user_id: string
          weight: number | null
        }
        Insert: {
          avg_calories_per_day?: number | null
          avg_protein_per_day?: number | null
          body_fat_percentage?: number | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          total_workouts_this_week?: number | null
          user_id: string
          weight?: number | null
        }
        Update: {
          avg_calories_per_day?: number | null
          avg_protein_per_day?: number | null
          body_fat_percentage?: number | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          total_workouts_this_week?: number | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      saved_recipes: {
        Row: {
          calories: number | null
          carbs: number | null
          conversation_id: string | null
          cook_time_minutes: number | null
          created_at: string | null
          difficulty: string | null
          fats: number | null
          id: string
          ingredients: Json
          instructions: string[]
          message_id: string | null
          notes: string | null
          prep_time_minutes: number | null
          protein: number | null
          servings: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          conversation_id?: string | null
          cook_time_minutes?: number | null
          created_at?: string | null
          difficulty?: string | null
          fats?: number | null
          id?: string
          ingredients: Json
          instructions: string[]
          message_id?: string | null
          notes?: string | null
          prep_time_minutes?: number | null
          protein?: number | null
          servings?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          conversation_id?: string | null
          cook_time_minutes?: number | null
          created_at?: string | null
          difficulty?: string | null
          fats?: number | null
          id?: string
          ingredients?: Json
          instructions?: string[]
          message_id?: string | null
          notes?: string | null
          prep_time_minutes?: number | null
          protein?: number | null
          servings?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_recipes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_recipes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          allergies: string[] | null
          avatar_url: string | null
          created_at: string | null
          daily_calorie_target: number | null
          daily_carbs_target: number | null
          daily_fats_target: number | null
          daily_protein_target: number | null
          dietary_restrictions: string[] | null
          email: string | null
          fitness_goals: string[] | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          allergies?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          daily_calorie_target?: number | null
          daily_carbs_target?: number | null
          daily_fats_target?: number | null
          daily_protein_target?: number | null
          dietary_restrictions?: string[] | null
          email?: string | null
          fitness_goals?: string[] | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          allergies?: string[] | null
          avatar_url?: string | null
          created_at?: string | null
          daily_calorie_target?: number | null
          daily_carbs_target?: number | null
          daily_fats_target?: number | null
          daily_protein_target?: number | null
          dietary_restrictions?: string[] | null
          email?: string | null
          fitness_goals?: string[] | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_substitution_preferences: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          original_ingredient: string
          preferred_substitute: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          original_ingredient: string
          preferred_substitute: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          original_ingredient?: string
          preferred_substitute?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          calories_burned: number | null
          completed_at: string | null
          exercises_performed: Json
          id: string
          intensity: string | null
          notes: string | null
          title: string
          total_duration_minutes: number
          user_id: string
          workout_plan_id: string | null
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string | null
          exercises_performed: Json
          id?: string
          intensity?: string | null
          notes?: string | null
          title: string
          total_duration_minutes: number
          user_id: string
          workout_plan_id?: string | null
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string | null
          exercises_performed?: Json
          id?: string
          intensity?: string | null
          notes?: string | null
          title?: string
          total_duration_minutes?: number
          user_id?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          category: string | null
          conversation_id: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_duration_minutes: number | null
          exercises: Json
          id: string
          message_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          exercises: Json
          id?: string
          message_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          conversation_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          id?: string
          message_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
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
