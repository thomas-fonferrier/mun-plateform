export interface Session {
  id: string;
  name: string;
  admin_token: string;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  country_code: string;
  country_name: string;
  token: string;
  joined_at: string;
}

export interface SpeakerTimer {
  id: string;
  session_id: string;
  country_code: string;
  country_name: string;
  duration_seconds: number;
  started_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface Motion {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  status: 'voting' | 'passed' | 'failed' | 'withdrawn';
  created_at: string;
  closed_at: string | null;
}

export interface Vote {
  id: string;
  motion_id: string;
  participant_id: string;
  country_code: string;
  country_name: string;
  vote: 'for' | 'against' | 'abstain';
  voted_at: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}
