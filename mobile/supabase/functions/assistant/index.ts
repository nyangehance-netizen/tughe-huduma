// TUGHE Assistant — answers members' questions and drafts officer replies.
// Deploy:  supabase functions deploy assistant
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (optional: ANTHROPIC_MODEL)
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_IDS = ["salary", "promotion", "transfer", "discipline", "leave", "safety", "pension", "membership", "harassment", "other"];

type Turn = { role: "user" | "assistant"; content: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Only signed-in users may use the assistant.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "assistant_not_configured" }, 503);
  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";

  let payload: { mode?: string; lang?: string; messages?: Turn[]; caseId?: string; draft?: string };
  try { payload = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const lang = payload.lang === "en" ? "English" : "Kiswahili";

  let system: string;
  let messages: Turn[];

  if (payload.mode === "draft") {
    // Officer reply drafting: officers only, case read under the officer's own permissions.
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!me || (me.role !== "officer" && me.role !== "admin")) return json({ error: "forbidden" }, 403);
    const { data: c } = await supabase.from("cases").select("*").eq("id", payload.caseId ?? "").single();
    if (!c) return json({ error: "not_found" }, 404);
    const { data: msgs } = await supabase.from("messages").select("kind, body").eq("case_id", c.id)
      .order("created_at", { ascending: false }).limit(6);
    system = `You draft replies for an officer of TUGHE (Tanzania Union of Government and Health Employees) to a union member about their case. Write in ${lang}, polite and clear, 60-120 words, plain text, no subject line, no placeholders in brackets. Say what TUGHE will do next or what the member must provide. Do not promise outcomes or invent facts, amounts or dates.`;
    messages = [{
      role: "user",
      content: `Case type: ${c.category}\nStage: ${c.status}\nTitle: ${c.title}\nMember's description: ${c.description}\nEmployer: ${c.employer ?? ""}, ${c.region ?? ""}\nRecent conversation (newest first): ${(msgs ?? []).map((m: { kind: string; body: string }) => `${m.kind}: ${m.body}`).join(" | ") || "none"}\nOfficer's current draft (improve it if present): ${payload.draft || "none"}`,
    }];
  } else {
    system = `You are the TUGHE Assistant, the help bot of TUGHE (Tanzania Union of Government and Health Employees), a trade union for public servants and health workers in Tanzania. Reply in ${lang}, plain text, no markdown, at most 120 words. Give practical general guidance on Tanzanian labour rights (Employment and Labour Relations Act 2004, Public Service Act Cap 298, Occupational Health and Safety Act 2003, Workers Compensation Act, PSSSF Act 2018). Never invent exact figures, deadlines, fees or office hours you are unsure of; when timing matters, tell the member to report the case in this app or contact TUGHE today. TUGHE head office: Mkoani Street Plot 189 Kibaha, phone 023 240 2534, info@tughe.or.tz. Service promise: urgent cases answered within 1 working day, normal cases within 3. On the final line write exactly CATEGORY=<one of: ${CATEGORY_IDS.join(", ")}, none>.`;
    messages = (payload.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    // The API needs the conversation to start with the user.
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length) return json({ error: "empty" }, 400);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 500, system, messages }),
  });
  if (!res.ok) return json({ error: "upstream", status: res.status }, 502);
  const out = await res.json();
  const raw: string = (out.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  const m = raw.match(/CATEGORY=(\w+)/);
  const category = m && CATEGORY_IDS.includes(m[1]) ? m[1] : null;
  const text = raw.replace(/\n?CATEGORY=\w*\s*$/, "").trim();
  return json({ text, category });
});
