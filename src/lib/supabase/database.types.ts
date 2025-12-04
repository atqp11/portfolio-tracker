/**
 * Database Types for Supabase
 *
 * These types define the schema for all database tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          tier: 'free' | 'basic' | 'premium'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          tier?: 'free' | 'basic' | 'premium'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          tier?: 'free' | 'basic' | 'premium'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          tier: string
          chat_queries: number
          portfolio_analysis: number
          sec_filings: number
          period_start: string
          period_end: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: string
          chat_queries?: number
          portfolio_analysis?: number
          sec_filings?: number
          period_start: string
          period_end: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: string
          chat_queries?: number
          portfolio_analysis?: number
          sec_filings?: number
          period_start?: string
          period_end?: string
          created_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          initial_value: number
          target_value: number
          borrowed_amount: number
          margin_call_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          initial_value: number
          target_value: number
          borrowed_amount: number
          margin_call_level: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          initial_value?: number
          target_value?: number
          borrowed_amount?: number
          margin_call_level?: number
          created_at?: string
          updated_at?: string
        }
      }
      stocks: {
        Row: {
          id: string
          portfolio_id: string
          symbol: string
          name: string
          shares: number
          avg_price: number
          current_price: number | null
          previous_price: number | null // Added previous_price field
          actual_value: number | null
          last_updated: string // Renamed updated_at to last_updated
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          symbol: string
          name: string
          shares: number
          avg_price: number
          current_price?: number | null
          previous_price?: number | null // Added previous_price field
          actual_value?: number | null
          last_updated?: string // Renamed updated_at to last_updated
          created_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          symbol?: string
          name?: string
          shares?: number
          avg_price?: number
          current_price?: number | null
          previous_price?: number | null // Added previous_price field
          actual_value?: number | null
          last_updated?: string // Renamed updated_at to last_updated
          created_at?: string
        }
      }
      investment_theses: {
        Row: {
          id: string
          portfolio_id: string
          ticker: string
          title: string
          description: string
          rationale: string
          bear_case: string | null
          risks: string[]
          key_metrics: Json
          stop_loss_rules: Json
          exit_criteria: Json
          thesis_health_score: number
          urgency: string
          last_validated: string | null
          validation_history: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          ticker: string
          title: string
          description: string
          rationale: string
          bear_case?: string | null
          risks: string[]
          key_metrics: Json
          stop_loss_rules: Json
          exit_criteria: Json
          thesis_health_score: number
          urgency: string
          last_validated?: string | null
          validation_history?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          ticker?: string
          title?: string
          description?: string
          rationale?: string
          bear_case?: string | null
          risks?: string[]
          key_metrics?: Json
          stop_loss_rules?: Json
          exit_criteria?: Json
          thesis_health_score?: number
          urgency?: string
          last_validated?: string | null
          validation_history?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      daily_checklists: {
        Row: {
          id: string
          portfolio_id: string
          date: string
          total_tasks: number
          completed_tasks: number
          completion_percentage: number
          current_streak: number
          longest_streak: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          date?: string
          total_tasks: number
          completed_tasks?: number
          completion_percentage?: number
          current_streak?: number
          longest_streak?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          date?: string
          total_tasks?: number
          completed_tasks?: number
          completion_percentage?: number
          current_streak?: number
          longest_streak?: number
          created_at?: string
          updated_at?: string
        }
      }
      checklist_tasks: {
        Row: {
          id: string
          checklist_id: string
          portfolio_id: string
          task: string
          category: string
          frequency: string
          urgency: string
          completed: boolean
          completed_at: string | null
          condition: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          checklist_id: string
          portfolio_id: string
          task: string
          category: string
          frequency: string
          urgency: string
          completed?: boolean
          completed_at?: string | null
          condition?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          checklist_id?: string
          portfolio_id?: string
          task?: string
          category?: string
          frequency?: string
          urgency?: string
          completed?: boolean
          completed_at?: string | null
          condition?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          email: string
          name: string | null
          notified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          notified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          notified?: boolean
          created_at?: string
        }
      }
      // ========================================================================
      // L3 Cache Tables
      // ========================================================================
      cache_filing_summaries: {
        Row: {
          ticker: string
          filing_type: string
          filing_date: string
          summary_text: string
          key_points: Json | null
          sentiment_score: number | null
          generated_at: string
          generated_by: string | null
          data_version: number
          expires_at: string | null
        }
        Insert: {
          ticker: string
          filing_type: string
          filing_date: string
          summary_text: string
          key_points?: Json | null
          sentiment_score?: number | null
          generated_at?: string
          generated_by?: string | null
          data_version?: number
          expires_at?: string | null
        }
        Update: {
          ticker?: string
          filing_type?: string
          filing_date?: string
          summary_text?: string
          key_points?: Json | null
          sentiment_score?: number | null
          generated_at?: string
          generated_by?: string | null
          data_version?: number
          expires_at?: string | null
        }
      }
      cache_company_profiles: {
        Row: {
          ticker: string
          profile_data: Json
          updated_at: string
          data_version: number
          expires_at: string
          source_count: number
          last_verified: string | null
        }
        Insert: {
          ticker: string
          profile_data: Json
          updated_at?: string
          data_version?: number
          expires_at: string
          source_count: number
          last_verified?: string | null
        }
        Update: {
          ticker?: string
          profile_data?: Json
          updated_at?: string
          data_version?: number
          expires_at?: string
          source_count?: number
          last_verified?: string | null
        }
      }
      cache_news_sentiment: {
        Row: {
          id: number
          ticker: string
          news_date: string
          news_url: string | null
          news_title: string
          sentiment_score: number
          sentiment_label: string
          confidence: number | null
          ai_summary: string | null
          key_topics: Json | null
          processed_at: string
          processed_by: string | null
          data_version: number
        }
        Insert: {
          id?: number
          ticker: string
          news_date: string
          news_url?: string | null
          news_title: string
          sentiment_score: number
          sentiment_label: string
          confidence?: number | null
          ai_summary?: string | null
          key_topics?: Json | null
          processed_at?: string
          processed_by?: string | null
          data_version?: number
        }
        Update: {
          id?: number
          ticker?: string
          news_date?: string
          news_url?: string | null
          news_title?: string
          sentiment_score?: number
          sentiment_label?: string
          confidence?: number | null
          ai_summary?: string | null
          key_topics?: Json | null
          processed_at?: string
          processed_by?: string | null
          data_version?: number
        }
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
  }
}
