export type Profile = {
  id: string;
  display_name: string;
  title: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Board = {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
  position: number;
};

export type Column = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
  color?: string | null;
};

export type Card = {
  id: string;
  column_id: string;
  title: string;
  description: string;
  position: number;
  created_at: string;
  /** 1–10 aciliyet; AI Magic veya manuel sıralama ile kullanılır */
  urgency_score?: number | null;
};
