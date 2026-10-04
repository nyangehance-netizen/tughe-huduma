export type Lang = "sw" | "en";
export type Role = "member" | "officer" | "admin";
export type CaseStatus = "received" | "review" | "action" | "resolved" | "closed";
export type Urgency = "normal" | "high";
export type ContactPref = "phone" | "sms" | "office";
export type MsgKind = "member" | "officer" | "bot";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  check_no: string | null;
  member_no: string | null;
  employer: string | null;
  station: string | null;
  region: string | null;
  role: Role;
  lang: Lang;
  push_token: string | null;
  consent_at: string | null;
  consent_version: string | null;
}

export interface Case {
  id: string;
  ref: string;
  member_id: string;
  category: string;
  title: string;
  description: string;
  urgency: Urgency;
  auto_urgent: boolean;
  contact_pref: ContactPref;
  status: CaseStatus;
  member_name: string | null;
  member_phone: string | null;
  check_no: string | null;
  member_no: string | null;
  employer: string | null;
  station: string | null;
  region: string | null;
  officer_id: string | null;
  officer_name: string | null;
  respond_by: string;
  due_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  case_id: string;
  sender_id: string | null;
  sender_name: string | null;
  kind: MsgKind;
  body: string;
  created_at: string;
}

export interface Note {
  id: string;
  case_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface CaseEvent {
  id: number;
  case_id: string;
  actor_name: string | null;
  event: "created" | "status" | "assigned" | "reply" | "extended" | "note" | string;
  detail: string | null;
  created_at: string;
}

export interface DeskStats {
  open_cases: number;
  overdue: number;
  due_soon: number;
  unassigned: number;
  resolved_30d: number;
  avg_days_to_resolve: number | null;
}

export interface CaseView {
  id: number;
  case_id: string;
  officer_name: string | null;
  viewed_at: string;
}
