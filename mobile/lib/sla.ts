import type { Case } from "./types";

export type SlaLevel = 0 | 1 | 2 | 3; // 0 done · 1 on track · 2 due soon · 3 overdue
export interface Sla { level: SlaLevel; tone: "ok" | "neutral" | "warn" | "bad"; text: string }

interface SlaStrings { late: string; today: string; left: string; noReply: string; done: string }

const DAY = 86400000;
const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

export const isOpen = (c: Pick<Case, "status">) => c.status !== "resolved" && c.status !== "closed";

export function slaOf(c: Case, s: SlaStrings, now = Date.now()): Sla {
  if (!isOpen(c)) {
    const end = new Date(c.resolved_at ?? c.updated_at).getTime();
    const days = Math.max(0, Math.round((end - new Date(c.created_at).getTime()) / DAY));
    return { level: 0, tone: "ok", text: `${s.done} ${days}` };
  }
  if (!c.first_response_at && new Date(c.respond_by).getTime() < now) return { level: 3, tone: "bad", text: s.noReply };
  const days = Math.round((startOfDay(new Date(c.due_at).getTime()) - startOfDay(now)) / DAY);
  if (days < 0) return { level: 3, tone: "bad", text: `${s.late} ${-days}` };
  if (days === 0) return { level: 2, tone: "warn", text: s.today };
  if (days <= 2) return { level: 2, tone: "warn", text: `${days} ${s.left}` };
  return { level: 1, tone: "neutral", text: `${days} ${s.left}` };
}

/** Add n working days (Mon–Fri), ending 17:00 — mirrors public.add_work_days in the database. */
export function addWorkDays(fromIso: string, n: number): string {
  const d = new Date(fromIso);
  let k = 0;
  while (k < n) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) k++;
  }
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}
