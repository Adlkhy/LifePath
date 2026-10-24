// Schema contract for the version-controlled Supabase migrations.
// Keep this schema contract in sync with the applied Supabase migrations.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type ChapterStatus = 'planned' | 'active' | 'completed' | 'archived'
export type GoalStatus = 'planned' | 'active' | 'completed' | 'paused' | 'abandoned'
export type GoalType = 'vision' | 'goal' | 'milestone' | 'quest'
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
    }
    Views: { [_ in never]: never }
    Functions: {
      reorder_chapters: { Args: { ordered_ids: string[] }; Returns: undefined }
      export_lifepath: { Args: Record<string, never>; Returns: Json }
      import_lifepath: { Args: { payload: Json }; Returns: Json }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
