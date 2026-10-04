// Rule-based assistant: answers common questions instantly and offline.
// Anything it can't handle is passed to the AI assistant (Supabase function "assistant").
import { CATEGORIES } from "./content";
import { fmtDate } from "./i18n";
import type { Case, Lang } from "./types";

export type BotAction =
  | { kind: "ask"; label: string; text: string }
  | { kind: "report"; label: string; category?: string }
  | { kind: "guide"; label: string; category?: string }
  | { kind: "cases"; label: string }
  | { kind: "case"; label: string; id: string }
  | { kind: "contacts"; label: string };

export interface BotReply { text: string; actions: BotAction[]; useAI?: boolean; category?: string }

interface BotStrings {
  quick: string[]; noCases: string; yourCases: string; notFound: string; report: string; contacts: string;
  leave: string; join: string; urgentNote: string; catIntro: string; more: string; greet: string; thanks: string;
  fallback: string; act: { report: string; guide: string; mine: string; contact: string };
}

export const quickActions = (b: BotStrings): BotAction[] => b.quick.map((q) => ({ kind: "ask" as const, label: q, text: q }));

export function caseLine(c: Case, lang: Lang, statusName: string, resolveBy: string): string {
  const off = c.officer_name ? (lang === "sw" ? ` Afisa: ${c.officer_name}.` : ` Officer: ${c.officer_name}.`) : "";
  const due = c.status === "resolved" || c.status === "closed" ? "" : ` ${resolveBy}: ${fmtDate(c.due_at, lang)}.`;
  return `${c.ref}: “${c.title}” – ${statusName}.${off}${due}`;
}

export function botReply(
  q: string, lang: Lang, b: BotStrings, myCases: Case[],
  statusName: (s: Case["status"]) => string, resolveBy: string, aiAvailable: boolean,
): BotReply {
  const A = b.act;
  const ref = q.match(/TGH-\d{6}-[A-Z0-9]{4}/i);
  if (ref) {
    const c = myCases.find((x) => x.ref.toUpperCase() === ref[0].toUpperCase());
    return c
      ? { text: caseLine(c, lang, statusName(c.status), resolveBy), actions: [{ kind: "case", label: c.ref, id: c.id }] }
      : { text: b.notFound, actions: [{ kind: "cases", label: A.mine }, { kind: "contacts", label: A.contact }] };
  }
  if (/fuatilia|hali ya shauri|shauri langu|mashauri yangu|track|status|my case/i.test(q)) {
    if (!myCases.length) return { text: b.noCases, actions: [{ kind: "report", label: A.report }] };
    const lines = myCases.slice(0, 5).map((c) => caseLine(c, lang, statusName(c.status), resolveBy)).join("\n\n");
    return { text: `${b.yourCases}\n\n${lines}`, actions: myCases.slice(0, 3).map((c) => ({ kind: "case" as const, label: c.ref, id: c.id })) };
  }
  if (q.length < 30 && /^(habari|mambo|hujambo|salama|shikamoo|hello|hi|hey|good (morning|afternoon|evening))\b/i.test(q)) {
    return { text: b.greet, actions: quickActions(b) };
  }
  if (q.length < 30 && /^(asante|ahsante|thanks|thank you|sawa)\b/i.test(q)) return { text: b.thanks, actions: [] };
  if (/jiunga|join|kuwa mwanachama|become a member/i.test(q)) {
    return { text: b.join, actions: [{ kind: "report", label: A.report, category: "membership" }, { kind: "guide", label: A.guide, category: "membership" }] };
  }
  if (/mawasiliano|namba ya simu|simu ya|barua pepe|anwani|ofisi iko|contact|phone|email|address|where is/i.test(q)) {
    return { text: b.contacts, actions: [{ kind: "contacts", label: A.contact }] };
  }
  if (/likizo|leave|maternity|paternity|uzazi|ubaba/i.test(q) && /siku ngapi|ngapi|how many|days|muda|haki|entitle/i.test(q)) {
    return { text: b.leave, actions: [{ kind: "report", label: A.report, category: "leave" }, { kind: "guide", label: A.guide, category: "leave" }] };
  }
  const cat = CATEGORIES.find((c) => c.kw && c.kw.test(q));
  if (cat && !aiAvailable) {
    const text = (cat.urgent ? b.urgentNote + "\n\n" : "") + b.catIntro + "\n• " + cat.guide[lang].join("\n• ") + "\n\n" + b.more;
    return { text, actions: [{ kind: "report", label: A.report, category: cat.id }, { kind: "guide", label: A.guide, category: cat.id }] };
  }
  if (!cat && /wasilisha|lalamik|ripoti|report|complain|submit|fungua shauri/i.test(q)) {
    return { text: b.report, actions: [{ kind: "report", label: A.report }] };
  }
  if (aiAvailable) return { text: "", actions: [], useAI: true, category: cat?.id };
  return { text: b.fallback, actions: [{ kind: "report", label: A.report }, { kind: "contacts", label: A.contact }] };
}

/** Offline answer for a category, used when the AI call fails. */
export function categoryAnswer(catId: string, lang: Lang, b: BotStrings): BotReply {
  const cat = CATEGORIES.find((c) => c.id === catId);
  if (!cat) return { text: b.fallback, actions: [{ kind: "report", label: b.act.report }] };
  const text = (cat.urgent ? b.urgentNote + "\n\n" : "") + b.catIntro + "\n• " + cat.guide[lang].join("\n• ") + "\n\n" + b.more;
  return { text, actions: [{ kind: "report", label: b.act.report, category: cat.id }, { kind: "guide", label: b.act.guide, category: cat.id }] };
}
