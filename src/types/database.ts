// Schema contract for the version-controlled Supabase migrations.
// Keep this schema contract in sync with the applied Supabase migrations.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type ChapterStatus = 'planned' | 'active' | 'completed' | 'archived'
export type GoalStatus = 'planned' | 'active' | 'completed' | 'paused' | 'abandoned'
export type GoalType = 'vision' | 'goal' | 'milestone' | 'quest'
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'legendary'
export type ConnectionType = 'prerequisite' | 'related'

type Timestamps = { created_at: string; updated_at: string }
export type Profile = Timestamps & {
  id: string
  display_name: string | null
  avatar_url: string | null
  preferences: Json
}
export type Chapter = Timestamps & {
  id: string
  user_id: string
  title: string
  description: string | null
  status: ChapterStatus
  start_date: string | null
  end_date: string | null
  sort_order: number
}
export type Goal = Timestamps & {
  id: string
  user_id: string
  chapter_id: string | null
  parent_id: string | null
  type: GoalType
  title: string
  description: string | null
  motivation: string | null
  success_criteria: string | null
  category: string | null
  status: GoalStatus
  priority: number | null
  difficulty: QuestDifficulty | null
  target_date: string | null
  completed_at: string | null
  position_x: number | null
  position_y: number | null
}
export type GoalConnection = {
  id: string
  user_id: string
  source_goal_id: string
  target_goal_id: string
  connection_type: ConnectionType
  created_at: string
}
export type ProgressEvent = {
  id: string
  user_id: string
  goal_id: string | null
  chapter_id: string | null
  event_type: string
  metadata: Json
  created_at: string
}
export type Memory = Timestamps & {
  id: string
  user_id: string
  goal_id: string | null
  chapter_id: string | null
  event_id: string | null
  kind: 'memory' | 'reflection'
  title: string
  description: string | null
  memory_date: string
  source_title: string | null
  photo_path: string | null
}

export type PersonalValue = Timestamps & {
  id: string; user_id: string; name: string; description: string; guiding_principle: string | null; sort_order: number
}
export type ValueGoal = { user_id: string; value_id: string; goal_id: string }
export type BucketListItem = { user_id: string; goal_id: string; created_at: string }
export type DailyPriority = { user_id: string; priority_date: string; slot: number; goal_id: string }
export type ReviewPeriod = 'weekly' | 'monthly'
export type GoalReview = Timestamps & {
  id: string; user_id: string; period_type: ReviewPeriod; period_start: string
  went_well: string; didnt_go_as_planned: string; next_focus: string
}

type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, Required>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, 'id'>
      chapters: Table<Chapter, 'title'>
      goals: Table<Goal, 'title'>
      goal_connections: Table<GoalConnection, 'source_goal_id' | 'target_goal_id'>
      progress_events: Table<ProgressEvent, 'event_type'>
      memories: Table<Memory, 'title'>
      personal_values: Table<PersonalValue, 'name'>
      value_goals: Table<ValueGoal, 'value_id' | 'goal_id'>
      bucket_list_items: Table<BucketListItem, 'goal_id'>
      daily_priorities: Table<DailyPriority, 'priority_date' | 'slot' | 'goal_id'>
      goal_reviews: Table<GoalReview, 'period_type' | 'period_start'>
    }
    Views: { [_ in never]: never }
    Functions: {
      reorder_chapters: { Args: { ordered_ids: string[] }; Returns: undefined }
      save_personal_value: { Args: { value_id: string | null; value_name: string; value_description: string; principle: string | null; goal_ids: string[] }; Returns: string }
      reorder_values: { Args: { ordered_ids: string[] }; Returns: undefined }
      create_bucket_experience: { Args: { experience_title: string; experience_description: string | null; experience_category: string | null; experience_date: string | null }; Returns: string }
      set_daily_priorities: { Args: { day: string; goal_ids: string[] }; Returns: undefined }
      export_lifepath: { Args: Record<string, never>; Returns: Json }
      import_lifepath: { Args: { payload: Json }; Returns: Json }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
