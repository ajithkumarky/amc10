export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image_url: string | null;
  created_at: number;
  last_activity_at: number;
  last_reminder_sent_at: number | null;
}

export interface AttemptRow {
  id: string;
  user_id: string;
  problem_slug: string;
  topic: string;
  subtopic: string | null;
  selected_answer: string;
  is_correct: number;
  mode: string;
  time_seconds: number | null;
  created_at: number;
}

export interface BookmarkRow {
  user_id: string;
  problem_slug: string;
  created_at: number;
}
