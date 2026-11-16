export type PhysicalCondition = 'OPTIMO' | 'DESGASTE' | 'REPARACION';
export type LexicalComplexity = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
export type ComprehensionStatus = 'EN_CURSO' | 'PENDIENTE_VALIDACION' | 'VALIDADO' | 'OMITIDO';
export type SlotPresence = 'present' | 'away' | 'empty';

export interface ReadingSession {
  id: number;
  user_id: number;
  book_id: number;
  checked_out_at: string;
  returned_at: string | null;
  reading_duration_minutes: number | null;
  comprehension_status: ComprehensionStatus;
  comprehension_score: number | null;
  ai_qualitative_summary: string | null;
  earned_reader_points: number;
  title: string | null;
  author: string | null;
}

export interface TwinBook {
  id: number | null;
  title: string;
  author: string;
  category: string;
  physical_condition: PhysicalCondition | null;
  lexical_complexity: LexicalComplexity | null;
}

export interface TwinSlot {
  slot: string;
  module: string;
  level: number;
  presence: SlotPresence;
  alert: 'overdue' | null;
  days_out: number;
  book: TwinBook | null;
}

export interface CategoryScore {
  category: string;
  average_score: number;
  sessions: number;
}

export interface QualitativeNote {
  category: string;
  score: number;
  points: number;
  summary: string;
  when: string;
}

export interface ServiceTicket {
  id: string;
  title: string;
  severity: 'alta' | 'media' | 'baja';
  state: 'abierto' | 'en_curso';
}

export interface WeeklyCapital {
  week: string;
  points: number;
}

export interface ServiceOperations {
  sla: {
    status: string;
    availability_target: number;
    availability_observed: number | null;
    open_seconds_target: number;
    open_tickets: number;
    proactive_alerts: number;
  };
  tickets: ServiceTicket[];
  weekly: WeeklyCapital[];
  rfid_tags: number;
  readers_active: number;
}

export interface ReaderCapital {
  points: number;
  level: number;
  finished: number;
  comprehension: number | null;
  points_to_next: number;
}

export interface Library40Overview {
  source: 'seed' | 'database';
  warning?: string;
  overdue_days: number;
  kpis: {
    finished_count: number;
    abandoned_count: number;
    in_progress_count: number;
    finished_rate: number;
    abandoned_rate: number;
    avg_reading_minutes: number;
    comprehension_by_category: CategoryScore[];
  };
  qualitative: QualitativeNote[];
  operations: ServiceOperations;
  twin: TwinSlot[];
  unslotted?: TwinSlot[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface EvaluateRequest {
  session_id: number;
  title: string;
  author: string;
  messages: ChatTurn[];
}

export interface EvaluateResponse {
  done: boolean;
  provider: 'openai' | 'gemini' | 'offline' | 'stored';
  reply: string | null;
  questions_asked?: number;
  questions_remaining?: number;
  comprehension_score?: number;
  ai_qualitative_summary?: string;
  points_awarded?: number;
  session?: ReadingSession;
  session_id?: number;
}
